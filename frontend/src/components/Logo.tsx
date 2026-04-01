export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`text-lg font-semibold tracking-tight text-foreground ${className}`}>
      attenborofy
    </span>
  );
}
