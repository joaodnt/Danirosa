import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tilt?: boolean;
  align?: "left" | "right" | "center";
};

const sizeMap = {
  sm: "text-xl sm:text-2xl",
  md: "text-2xl sm:text-3xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-5xl"
};

export function Handwritten({
  children,
  className,
  size = "md",
  tilt = true,
  align = "left"
}: Props) {
  return (
    <p
      className={cn(
        "font-handwritten leading-tight text-accent-gold/90",
        sizeMap[size],
        tilt && "-rotate-1",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </p>
  );
}
