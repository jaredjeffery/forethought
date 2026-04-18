// Consistent section header label used across all public pages.
// Uppercase, small, letter-spaced, accent blue.

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <p
      className={`text-xs font-bold tracking-widest text-accent uppercase mb-5 ${className}`}
    >
      {children}
    </p>
  );
}
