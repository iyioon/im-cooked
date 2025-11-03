import { useState, useCallback, useEffect, useRef } from "react";

export interface Timer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: number;
  isCompleted: boolean;
}

export interface UseTimerReturn {
  timers: Timer[];
  addTimer: (durationSeconds: number, label?: string) => string;
  removeTimer: (id: string) => void;
  clearAllTimers: () => void;
  onTimerComplete: (callback: (timer: Timer) => void) => void;
}

/**
 * Hook to manage multiple cooking timers
 * Supports multiple simultaneous timers with labels
 */
export function useTimer(): UseTimerReturn {
  const [timers, setTimers] = useState<Timer[]>([]);
  const timerCallbackRef = useRef<((timer: Timer) => void) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Add a new timer
   */
  const addTimer = useCallback((durationSeconds: number, label?: string): string => {
    const id = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newTimer: Timer = {
      id,
      label: label || "Timer",
      totalSeconds: durationSeconds,
      remainingSeconds: durationSeconds,
      startedAt: Date.now(),
      isCompleted: false,
    };

    setTimers((prev) => [...prev, newTimer]);
    return id;
  }, []);

  /**
   * Remove a timer by ID
   */
  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  }, []);

  /**
   * Clear all timers
   */
  const clearAllTimers = useCallback(() => {
    setTimers([]);
  }, []);

  /**
   * Register a callback to be called when a timer completes
   */
  const onTimerComplete = useCallback((callback: (timer: Timer) => void) => {
    timerCallbackRef.current = callback;
  }, []);

  /**
   * Update timers every second
   */
  useEffect(() => {
    if (timers.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimers((prev) => {
        const updated = prev.map((timer) => {
          if (timer.isCompleted) return timer;

          const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
          const remaining = Math.max(0, timer.totalSeconds - elapsed);

          // Check if timer just completed
          if (remaining === 0 && !timer.isCompleted) {
            const completedTimer = { ...timer, remainingSeconds: 0, isCompleted: true };
            
            // Call the completion callback
            if (timerCallbackRef.current) {
              timerCallbackRef.current(completedTimer);
            }

            return completedTimer;
          }

          return { ...timer, remainingSeconds: remaining };
        });

        return updated;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timers.length]);

  return {
    timers,
    addTimer,
    removeTimer,
    clearAllTimers,
    onTimerComplete,
  };
}
