import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GameCardProps {
  title: string;
  image: string;
  gradient?: string;
  onClick?: () => void;
}

export const GameCard = ({ title, image, gradient, onClick }: GameCardProps) => {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border-0 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-[200px]",
        gradient || "bg-gradient-to-br from-purple-600 to-blue-600"
      )}
      onClick={onClick}
    >
      <div className="aspect-[3/4] relative">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </Card>
  );
};
