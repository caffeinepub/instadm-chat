import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  return (
    <span
      className="verified-badge flex-shrink-0"
      title="Verified"
      style={{ width: size, height: size }}
    >
      <Check size={size * 0.65} strokeWidth={3} />
    </span>
  );
}
