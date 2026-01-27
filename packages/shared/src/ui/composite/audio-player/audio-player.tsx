"use client";

import { ChevronDown, ChevronUp, Music, Pause, Play, Trees, X, BookOpen, Mic, Sparkles } from "lucide-react";

import { useAudioPlayer } from "./audio-player-context";
import { Button } from "../../primitives/button";
import { Slider } from "../../primitives/slider";
import { cn } from "../../utils";

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const typeIcons = {
  music: Music,
  sfx: Sparkles,
  ambiance: Trees,
  story: BookOpen,
  voice: Mic,
};

const typeLabels = {
  music: "Music",
  sfx: "Sound Effect",
  ambiance: "Ambiance",
  story: "Story",
  voice: "Voice",
};

export function AudioPlayer() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    isVisible,
    toggle,
    seek,
    stop,
    hide,
    show,
  } = useAudioPlayer();

  // Don't render if no track
  if (!track) return null;

  const Icon = typeIcons[track.type];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Minimized state - just a small button to restore
  if (!isVisible) {
    return (
      <div className="sticky bottom-4 z-50 flex justify-end px-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={show}
          className="shadow-lg gap-2"
        >
          <Icon className="h-4 w-4" />
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{track.name}</span>
            <span className="text-xs text-muted-foreground">{typeLabels[track.type]}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-1 flex-col items-center gap-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={toggle}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="flex-1"
              onValueChange={(values) => {
                const value = values[0];
                if (duration > 0 && value !== undefined) {
                  seek((value / 100) * duration);
                }
              }}
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 min-w-[100px] justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={hide}
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={stop}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
