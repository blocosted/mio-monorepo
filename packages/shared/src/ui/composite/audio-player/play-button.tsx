"use client";

import { Pause, Play } from "lucide-react";

import { Button } from "../../primitives/button";
import { type AudioTrack, useAudioPlayer } from "./audio-player-context";

interface PlayButtonProps {
  track: AudioTrack;
}

export function PlayButton({ track }: PlayButtonProps) {
  const { track: currentTrack, isPlaying, play, pause } = useAudioPlayer();

  const isCurrentTrack = currentTrack?.id === track.id && currentTrack?.url === track.url;
  const isThisPlaying = isCurrentTrack && isPlaying;

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
    >
      {isThisPlaying ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </Button>
  );
}
