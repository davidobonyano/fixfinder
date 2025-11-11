import React from "react";

export default function Logo({ className = "", textClassName = "", iconClassName = "", compact = false }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg className={iconClassName || "w-6 h-6"} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="fyf-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="url(#fyf-grad)" />
        <path d="M9.5 16.5h6m0 0l3.5-6m-3.5 6l3.5 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span
          className={`${textClassName || "text-xl font-extrabold tracking-tight"} font-logo tracking-tighter leading-none logo-gradient`}
        >
          FindYourFixer
        </span>
      )}
    </div>
  );
}




