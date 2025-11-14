import { FaCheckCircle } from "react-icons/fa";

const sizeMap = {
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-xs px-3 py-1 gap-1.5",
  lg: "text-sm px-3.5 py-1.5 gap-2",
};

export default function VerifiedBadge({ size = "md", label = "Verified Pro", className = "" }) {
  const sizeClasses = sizeMap[size] || sizeMap.md;
  const iconClasses = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <span
      className={`inline-flex items-center rounded-full border border-sky-500/40 bg-white text-sky-600 font-semibold uppercase tracking-wide ${sizeClasses} ${className}`}
    >
      <FaCheckCircle className={iconClasses} />
      <span>{label}</span>
    </span>
  );
}

