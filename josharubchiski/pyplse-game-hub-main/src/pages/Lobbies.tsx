import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Gem, Lock, Unlock } from "lucide-react";
import { dbHelpers, auth } from "@/integrations/database";
import { useToast } from "@/hooks/use-toast";

interface Lobby {
  id: string;
  name: string;
  host_id: string;
  max_players: number;
  current_players: number;
  bet_amount: number;
  is_private: boolean;
  is_throw_in: boolean;
  deck_size: number;
  status: string;
  profiles: {
    username: string;
  };
}

const Lobbies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("lobbies");
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Create lobby form state
  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [betAmount, setBetAmount] = useState("10");
  const [deckSize, setDeckSize] = useState("36");
  const [isThrowIn, setIsThrowIn] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    checkAuth();
    loadLobbies();
  }, []);

  const checkAuth = async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      navigate("/");
      return;
    }
    const user = await auth.getUser(sessionId);
    if (!user) {
      navigate("/");
      return;
    }
    setUserId(user.id);
  };

  const loadLobbies = async () => {
    try {
      const lobbiesData = await dbHelpers.query(`
        SELECT gl.*, p.username as host_username
        FROM game_lobbies gl
        LEFT JOIN profiles p ON gl.host_id = p.id
        WHERE gl.status = 'waiting'
        ORDER BY gl.created_at DESC
      `);

      const formattedLobbies = lobbiesData.map((lobby: any) => ({
        ...lobby,
        profiles: { username: lobby.host_username }
      }));

      setLobbies(formattedLobbies);
    } catch (error) {
      console.error("Error loading lobbies:", error);
    }
  };



  const createLobby = async () => {
    if (!userId) return;

    if (!lobbyName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название лобби",
        variant: "destructive",
      });
      return;
    }

    try {
      const profile = await dbHelpers.get('SELECT diamonds_balance FROM profiles WHERE id = ?', [userId]) as any;

      if (!profile || profile.diamonds_balance < parseInt(betAmount)) {
        toast({
          title: "Недостаточно средств",
          description: "У вас недостаточно бриллиантов для создания этого лобби",
          variant: "destructive",
        });
        return;
      }

      const lobbyId = Math.random().toString(36).substring(2) + Date.now().toString(36);

      await dbHelpers.run(
        'INSERT INTO game_lobbies (id, host_id, name, max_players, bet_amount, deck_size, is_throw_in, is_private, password, status, current_players) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [lobbyId, userId, lobbyName, parseInt(maxPlayers), parseInt(betAmount), parseInt(deckSize), isThrowIn ? 1 : 0, isPrivate ? 1 : 0, isPrivate ? password : null, 'waiting', 1]
      );

      await dbHelpers.run(
        'INSERT INTO lobby_players (lobby_id, player_id, position) VALUES (?, ?, ?)',
        [lobbyId, userId, 0]
      );

      setIsCreateDialogOpen(false);
      toast({
        title: "Лобби создано",
        description: "Ожидайте присоединения других игроков",
      });

      navigate(`/game/${lobbyId}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать лобби",
        variant: "destructive",
      });
    }
  };

  const joinLobby = async (lobby: Lobby) => {
    if (!userId) return;

    try {
      const profile = await dbHelpers.get('SELECT diamonds_balance FROM profiles WHERE id = ?', [userId]) as any;

      if (!profile || profile.diamonds_balance < lobby.bet_amount) {
        toast({
          title: "Недостаточно средств",
          description: "У вас недостаточно бриллиантов для участия в этой игре",
          variant: "destructive",
        });
        return;
      }

      const players = await dbHelpers.query(
        'SELECT position FROM lobby_players WHERE lobby_id = ? ORDER BY position DESC LIMIT 1',
        [lobby.id]
      ) as any[];

      const nextPosition = players && players.length > 0 ? (players[0] as any).position + 1 : 1;

      await dbHelpers.run(
        'INSERT INTO lobby_players (lobby_id, player_id, position) VALUES (?, ?, ?)',
        [lobby.id, userId, nextPosition]
      );

      await dbHelpers.run(
        'UPDATE game_lobbies SET current_players = current_players + 1 WHERE id = ?',
        [lobby.id]
      );

      navigate(`/game/${lobby.id}`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось присоединиться к лобби",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onLoginClick={() => {}}
        onRegisterClick={() => {}}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isAuthenticated={true}
        balance={0}
        onDepositClick={() => {}}
      />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 pb-12">
          <section className="container px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                Лобби игры "Дурак"
              </h1>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Создать лобби
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Создать новое лобби</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Название лобби</Label>
                      <Input
                        id="name"
                        value={lobbyName}
                        onChange={(e) => setLobbyName(e.target.value)}
                        placeholder="Моя игра"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="players">Количество игроков</Label>
                      <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 игрока</SelectItem>
                          <SelectItem value="3">3 игрока</SelectItem>
                          <SelectItem value="4">4 игрока</SelectItem>
                          <SelectItem value="6">6 игроков</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bet">Ставка (бриллианты)</Label>
                      <Input
                        id="bet"
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deck">Колода карт</Label>
                      <Select value={deckSize} onValueChange={setDeckSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 карты</SelectItem>
                          <SelectItem value="36">36 карт</SelectItem>
                          <SelectItem value="52">52 карты</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="throw-in">Подкидной дурак</Label>
                      <Switch
                        id="throw-in"
                        checked={isThrowIn}
                        onCheckedChange={setIsThrowIn}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="private">Приватное лобби</Label>
                      <Switch
                        id="private"
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                      />
                    </div>

                    {isPrivate && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Пароль</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Введите пароль"
                        />
                      </div>
                    )}

                    <Button className="w-full" onClick={createLobby}>
                      Создать
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lobbies.map((lobby) => (
                <Card key={lobby.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          {lobby.is_private ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Unlock className="h-4 w-4 text-muted-foreground" />
                          )}
                          {lobby.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Хост: {lobby.profiles?.username || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Игроки:</span>
                        <span className="font-semibold">
                          {lobby.current_players}/{lobby.max_players}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ставка:</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Gem className="h-4 w-4 text-primary" />
                          {lobby.bet_amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Колода:</span>
                        <span className="font-semibold">{lobby.deck_size} карт</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Тип:</span>
                        <span className="font-semibold">
                          {lobby.is_throw_in ? "Подкидной" : "Переводной"}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => joinLobby(lobby)}
                      disabled={lobby.current_players >= lobby.max_players}
                    >
                      {lobby.current_players >= lobby.max_players
                        ? "Лобби заполнено"
                        : "Присоединиться"}
                    </Button>
                  </div>
                </Card>
              ))}

              {lobbies.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Нет доступных лобби. Создайте своё!
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <MobileMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAuthenticated={true}
      />
    </div>
  );
};

export default Lobbies;
