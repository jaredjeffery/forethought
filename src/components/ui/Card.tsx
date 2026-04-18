// White surface card with shadow and rounded corners.

interface CardProps {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
  style?: React.CSSProperties;
}

const paddingMap = {
  none: "",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-8",
};

export function Card({ children, className = "", raised = false, padding = "md", style }: CardProps) {
  return (
    <div
      style={style}
      className={`${raised ? "card-raised" : "card"} ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
