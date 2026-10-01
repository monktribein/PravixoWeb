import React from "react";

/**
 * InfiniteMarqueeTrack
 * Reusable auto-scrolling horizontal marquee wrapper for any card lists:
 * - Pure CSS smooth scrolling (@keyframes translateX(0) -> translateX(-50%))
 * - Renders children twice for seamless loop
 * - Pauses on hover
 * - Edge gradient fade masks
 * - Supports custom speed & direction
 */
export function InfiniteMarqueeTrack({
  children,
  speed = 45, // seconds for full cycle (higher = slower & smoother)
  reverse = false,
  pauseOnHover = true,
  className = "",
  gap = "gap-6",
}) {
  return (
    <div
      className={`relative w-full overflow-hidden py-3 select-none ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
      }}
    >
      <div
        className={`flex w-max ${gap} marquee-track will-change-transform ${
          reverse ? "marquee-track-reverse" : ""
        } ${!pauseOnHover ? "!animation-play-state-running" : ""}`}
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {/* Render children twice for seamless infinite wrapping */}
        {children}
        {children}
      </div>
    </div>
  );
}

export default InfiniteMarqueeTrack;
