import { Home, Gamepad2, Trophy, User, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAuthenticated?: boolean;
}

export const MobileMenu = ({ activeTab, onTabChange, isAuthenticated }: MobileMenuProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around p-2">
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === "home" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => onTabChange("home")}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Главная</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === "games" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => onTabChange("games")}
        >
          <Gamepad2 className="h-5 w-5" />
          <span className="text-xs">Игры</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === "ratings" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => onTabChange("ratings")}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-xs">Рейтинги</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            activeTab === "bonus" ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
          onClick={() => onTabChange("bonus")}
        >
          <Gift className="h-5 w-5" />
          <span className="text-xs">Бонусы</span>
        </Button>

        {isAuthenticated && (
          <Button
            variant="ghost"
            size="icon"
            className={`flex flex-col items-center gap-1 h-auto py-2 ${
              activeTab === "profile" ? "text-primary bg-primary/10" : "text-muted-foreground"
            }`}
            onClick={() => onTabChange("profile")}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Профиль</span>
          </Button>
        )}
      </div>
    </div>
  );
};
