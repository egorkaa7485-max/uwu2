import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MobileMenu } from "@/components/MobileMenu";
import { GameCard } from "@/components/GameCard";
import { MiniGameCard } from "@/components/MiniGameCard";
import { LoginModal } from "@/components/LoginModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pickaxe, Gem, Coins, ChevronLeft, ChevronRight } from "lucide-react";
import durakImg from "@/assets/durak.png";
import monopolyImg from "@/assets/monopoly.png";
import unoImg from "@/assets/uno.png";
import bonusBanner from "@/assets/bonus-banner.png";
import { auth } from "@/integrations/database";

const Index = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<"login" | "register">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check if user is logged in via localStorage
    const session = localStorage.getItem('session');
    const userStr = localStorage.getItem('user');

    if (session && userStr) {
      const user = JSON.parse(userStr);
      setIsAuthenticated(true);
      loadProfile(user.id);
    }
  };

  const loadProfile = async (userId: string) => {
    // Load profile from database
    const { data, error } = await auth.getProfile(userId);
    if (data && !error) {
      setBalance(data.diamonds_balance);
    }
  };

  const openLoginModal = () => {
    setLoginModalTab("login");
    setLoginModalOpen(true);
  };

  const openRegisterModal = () => {
    setLoginModalTab("register");
    setLoginModalOpen(true);
  };

  const handleLogin = async () => {
    setLoginModalOpen(false);
    // Check auth after login
    const session = localStorage.getItem('session');
    const userStr = localStorage.getItem('user');

    if (session && userStr) {
      const user = JSON.parse(userStr);
      setIsAuthenticated(true);
      loadProfile(user.id);
    }
  };

  const handleDurakClick = () => {
    if (!isAuthenticated) {
      openLoginModal();
    } else {
      navigate("/lobbies");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isAuthenticated={isAuthenticated}
        balance={balance}
        onDepositClick={() => alert("Пополнение счета")}
      />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 pb-12">
          {/* Hero Banner Section */}
          <section className="container px-4 py-8">
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src={bonusBanner}
                alt="Bonus Banner"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-between px-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/30 hover:bg-black/50 text-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/30 hover:bg-black/50 text-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </section>

          {/* Classic Games Section */}
          <section className="container px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Gem className="h-6 w-6 text-primary" />
                Классические игры
              </h2>
              <Button variant="link" className="text-primary">
                Все игры →
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <GameCard
                title="Дурак"
                image={durakImg}
                gradient="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700"
                onClick={handleDurakClick}
              />
              <GameCard
                title="Монополия"
                image={monopolyImg}
                gradient="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500"
              />
              <GameCard
                title="UNO"
                image={unoImg}
                gradient="bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600"
              />
            </div>
          </section>

          {/* Mini Games Section */}
          <section className="container px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Coins className="h-6 w-6 text-primary" />
                Мини-игры
              </h2>
              <Button variant="link" className="text-primary">
                Все игры →
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <MiniGameCard
                title="MINES"
                icon={Pickaxe}
                gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              />
              <MiniGameCard
                title="CRASH"
                icon={Gem}
                gradient="bg-gradient-to-br from-orange-500 to-red-600"
              />
              <MiniGameCard
                title="COINFLIP"
                icon={Coins}
                gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
              />
            </div>
          </section>


          {/* Leaderboard Section */}
          <section className="container px-4 py-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Gem className="h-6 w-6 text-primary" />
              Рейтинг богатейших игроков
            </h2>

            <Card className="p-6">
              <div className="space-y-4">
                {[
                  { rank: 1, name: "Player***", balance: "💎 125,890" },
                  { rank: 2, name: "Gamer***", balance: "💎 98,450" },
                  { rank: 3, name: "Pro***", balance: "💎 87,230" },
                  { rank: 4, name: "Winner***", balance: "💎 76,540" },
                  { rank: 5, name: "Lucky***", balance: "💎 65,890" },
                ].map((player) => (
                  <div
                    key={player.rank}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {player.rank}
                      </div>
                      <span className="font-semibold">{player.name}</span>
                    </div>
                    <span className="font-bold text-lg">{player.balance}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </main>
      </div>

      <MobileMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAuthenticated={isAuthenticated}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        defaultTab={loginModalTab}
        onLoginSuccess={handleLogin}
      />
    </div>
  );
};

export default Index;
