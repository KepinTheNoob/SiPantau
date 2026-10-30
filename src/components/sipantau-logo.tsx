import React from "react";

export function SipantauIcon({
  className = "h-8 w-8",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Magnifying Glass Outer Frame in Vibrant Blue (#0D6BE3) */}
      {/* Ring with top-right dynamic gap */}
      <path
        d="M 68 28 C 64 21 57 16 48 15 C 30 15 15 30 15 48 C 15 66 30 81 48 81 C 59 81 69 75 75 66"
        stroke="#0D6BE3"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Handle */}
      <path
        d="M 72 72 L 87 87"
        stroke="#0D6BE3"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* GPS Location Pin & Checkmark in Emerald Green (#0ABC8F) */}
      {/* Pin Body */}
      <path
        d="M 48 24 C 40.5 24 34.5 30 34.5 37.5 C 34.5 45.5 44 56 46.5 58.5 L 48 60 L 49.5 58.5 C 51 57 56 52 59 47 C 60.5 44.5 61.5 41 61.5 37.5 C 61.5 30 55.5 24 48 24 Z"
        fill="#0ABC8F"
      />
      {/* Pin Center Hole */}
      <circle cx="48" cy="37.5" r="4.5" fill="white" />

      {/* Integrated Checkmark Badge */}
      <path
        d="M 40 59 L 47 66 L 63 50"
        stroke="#0ABC8F"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SipantauLogo({
  size = "md",
  showSubtitle = false,
  className = "",
}: {
  readonly size?: "sm" | "md" | "lg";
  readonly showSubtitle?: boolean;
  readonly className?: string;
}) {
  const iconDimensions =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-11 w-11" : "h-8 w-8";

  const textDimensions =
    size === "sm"
      ? "text-base font-extrabold"
      : size === "lg"
        ? "text-2xl font-black"
        : "text-xl font-black";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <SipantauIcon className={`${iconDimensions} shrink-0`} />
      <div className="flex flex-col">
        <div className={`tracking-tight leading-none ${textDimensions}`}>
          <span className="text-[#0D6BE3]">SIPAN</span>
          <span className="text-[#0ABC8F]">TAU</span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase mt-0.5">
            Portal Transparansi Proyek
          </span>
        )}
      </div>
    </div>
  );
}
