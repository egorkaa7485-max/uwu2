import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Gamepad2,
  Trophy,
  Gift,
  Sparkles,
  Zap,
  Crown,
  Dices,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="font-semibold">Меню</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-full px-3 py-4">
          <div className="space-y-1">
            <div className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Казино
              </h3>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Новые
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Crown className="h-4 w-4 text-primary" />
                Топ игр
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Trophy className="h-4 w-4 text-primary" />
                Любимые игры
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Zap className="h-4 w-4 text-primary" />
                Быстрые игры
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Игры
              </h3>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Gamepad2 className="h-4 w-4 text-destructive" />
                Дурак
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Gamepad2 className="h-4 w-4 text-destructive" />
                Монополия
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Gamepad2 className="h-4 w-4 text-destructive" />
                UNO
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Dices className="h-4 w-4 text-destructive" />
                Мини-игры
              </Button>
            </div>

            <div>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Другое
              </h3>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Gift className="h-4 w-4 text-success" />
                Бонусы
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
              >
                <Trophy className="h-4 w-4 text-success" />
                Рейтинги
              </Button>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};
