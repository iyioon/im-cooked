"use client";

import { Timer as TimerIcon, X, Bell } from "lucide-react";
import { Timer } from "@/hooks/useTimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface TimerDisplayProps {
  timers: Timer[];
  onRemove: (id: string) => void;
}

/**
 * Format seconds to MM:SS display
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TimerDisplay({ timers, onRemove }: TimerDisplayProps) {
  if (timers.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 space-y-2 max-w-sm">
      {timers.map((timer) => (
        <Card
          key={timer.id}
          className={`p-4 backdrop-blur-lg border-2 shadow-lg transition-all ${
            timer.isCompleted
              ? "bg-red-500/20 border-red-500 animate-pulse"
              : "bg-black/60 border-white/20"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              {timer.isCompleted ? (
                <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-white animate-bounce" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TimerIcon className="h-5 w-5 text-blue-400" />
                </div>
              )}
              
              <div className="flex-1">
                <p className="text-sm text-gray-300 font-medium">{timer.label}</p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      timer.isCompleted
                        ? "text-red-400"
                        : timer.remainingSeconds <= 10
                        ? "text-orange-400"
                        : "text-white"
                    }`}
                  >
                    {formatTime(timer.remainingSeconds)}
                  </p>
                  {timer.isCompleted && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                      Done!
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={() => onRemove(timer.id)}
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
