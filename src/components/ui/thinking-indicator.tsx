export function ThinkingIndicator() {
  return (
    <div
      className="rounded-2xl px-5 py-3 bg-white/5 border border-white/10 text-white backdrop-blur-sm inline-block"
      role="status"
      aria-live="polite"
      aria-label="Assistant is thinking"
    >
      <div className="flex items-center gap-1" aria-hidden="true">
        <span className="text-gray-400 animate-[pulse_1.4s_ease-in-out_0s_infinite]">
          •
        </span>
        <span className="text-gray-400 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]">
          •
        </span>
        <span className="text-gray-400 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]">
          •
        </span>
      </div>
      <span className="sr-only">Assistant is thinking</span>
    </div>
  );
}
