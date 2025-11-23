"use client";

import { useState, useEffect } from "react";

export function VideoBackground() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Give the iframe a moment to start loading, then fade in
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`absolute inset-0 z-0 w-full h-full overflow-hidden transition-opacity duration-[2000ms] ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
    >
      <iframe
        className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 scale-150 pointer-events-none border-0"
        src="https://www.youtube.com/embed/i5T6Fnbq34c?autoplay=1&mute=1&loop=1&playlist=i5T6Fnbq34c&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1"
        title="Background video"
        allow="autoplay; encrypted-media"
      />
    </div>
  );
}
