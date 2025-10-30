import { Button } from "@/components/ui/button";
import { Home, Gamepad2, Trophy, Gift, Globe, Menu, Gem, User } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

interface HeaderProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onMenuClick: () => void;
  isAuthenticated?: boolean;
  balance?: number;
  onDepositClick?: () => void;
}

export const Header = ({ onLoginClick, onRegisterClick, onMenuClick, isAuthenticated = false, balance = 0, onDepositClick }: HeaderProps) => {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <img src={logo} alt="PPYLSE" className="h-8 w-auto" />

          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant={activeTab === "home" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("home")}
            >
              <Home className="h-4 w-4" />
              Главная
            </Button>
            <Button
              variant={activeTab === "games" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("games")}
            >
              <Gamepad2 className="h-4 w-4" />
              Игры
            </Button>
            <Button
              variant={activeTab === "ratings" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("ratings")}
            >
              <Trophy className="h-4 w-4" />
              Рейтинги
            </Button>
            <Button
              variant="ghost"
              className="gap-2 relative"
            >
              <Gift className="h-4 w-4" />
              Free Money
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary rounded-full">
                Скоро
              </span>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                <span className="text-sm text-muted-foreground">Баланс</span>
                <span className="font-bold flex items-center gap-1">
                  {balance.toFixed(2)} <Gem className="h-4 w-4 text-primary" />
                </span>
              </div>
              <Button className="bg-success hover:bg-success/90" onClick={onDepositClick}>
                Пополнить в 1 клик
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <User className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Globe className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={onLoginClick}>
                Вход
              </Button>
              <Button variant="default" className="bg-success hover:bg-success/90" onClick={onRegisterClick}>
                Регистрация
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
