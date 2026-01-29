"use client";

import { Loader2, Pause, Play } from "lucide-react";

import { Button } from "@mio/ui/button";
import { type AudioTrack, useAudioPlayer } from "@/contexts/audio-player-context";

interface PlayButtonProps {
  track: AudioTrack;
  size?: "sm" | "icon";
}

export function PlayButton({ track, size = "sm" }: PlayButtonProps) {
  const { track: currentTrack, isPlaying, isLoading, play, pause } = useAudioPlayer();

  const isCurrentTrack = currentTrack?.id === track.id && currentTrack?.url === track.url;
  const isThisPlaying = isCurrentTrack && isPlaying;
  const isThisLoading = isCurrentTrack && isLoading;

  const handleClick = () => {
    if (isThisPlaying) {
      pause();
    } else {
      play(track);
    }
  };

  const iconSize = size === "icon" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={isThisLoading}
    >
      {isThisLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isThisPlaying ? (
        <Pause className={iconSize} />
      ) : (
        <Play className={iconSize} />
      )}
    </Button>
  );
}
