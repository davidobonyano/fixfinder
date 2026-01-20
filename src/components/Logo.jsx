import React from "react";

export default function Logo({ className = "", textClassName = "", iconClassName = "", compact = false }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Block shaped green square matching login pages */}
      <div className={`${iconClassName || "w-4 h-4"} bg-trust flex-shrink-0`}></div>
      {!compact && (
        <span
          className={`${textClassName || "text-xl font-black tracking-tighter"} font-sans`}
        >
          FYF
        </span>
      )}
    </div>
  );
}
