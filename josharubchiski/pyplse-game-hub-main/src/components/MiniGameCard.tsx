import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MiniGameCardProps {
  title: string;
  icon: LucideIcon;
  gradient: string;
  onClick?: () => void;
}

export const MiniGameCard = ({ title, icon: Icon, gradient, onClick }: MiniGameCardProps) => {
  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl border-0 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-[200px] ${gradient}`}
      onClick={onClick}
    >
      <div className="aspect-[3/4] p-6 flex flex-col items-center justify-center text-center">
        <Icon className="h-20 w-20 mb-4 text-white drop-shadow-lg" />
        <h3 className="text-2xl font-bold text-white drop-shadow-lg">{title}</h3>
        <div className="absolute bottom-4 right-4 text-xs font-semibold text-white/80">
          PPYLSE
        </div>
      </div>
    </Card>
  );
};
