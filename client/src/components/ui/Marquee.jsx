import React from "react";

/**
 * Marquee Component
 * - Pure CSS seamless horizontal auto-scroll (translateX(0) -> translateX(-50%))
 * - Renders content twice (second copy with aria-hidden="true")
 * - Pauses on hover
 * - Smooth mask-image edge gradients
 * - Respects prefers-reduced-motion
 */
export function Marquee({
  children,
  speed = 60, // seconds for full cycle (higher = slower)
  reverse = false,
  pauseOnHover = true,
  className = "",
  gap = "gap-6",
  withFade = false,
}) {
  return (
    <div
      className={`group relative w-full overflow-hidden py-3 select-none ${className}`}
      style={
        withFade
          ? {
              maskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }
          : {}
      }
    >
      <div
        className={`flex w-max ${gap} marquee-track will-change-transform ${
          reverse ? "marquee-track-reverse" : ""
        } ${!pauseOnHover ? "!animation-play-state-running" : ""}`}
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {/* Original Content */}
        <div className={`flex items-stretch ${gap}`}>
          {children}
        </div>

        {/* Cloned copy for seamless infinite loop */}
        <div className={`flex items-stretch ${gap}`} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Marquee;
