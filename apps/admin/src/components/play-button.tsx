"use client";

import { Loader2, Pause, Play } from "lucide-react";

import { Button } from "@mio/ui/button";
import { type AudioTrack, useAudioPlayer } from "@/contexts/audio-player-context";

interface PlayButtonProps {
  track: AudioTrack;
}

export function PlayButton({ track }: PlayButtonProps) {
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

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isThisLoading}
    >
      {isThisLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isThisPlaying ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </Button>
  );
}
