"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  type: "music" | "sfx" | "ambiance" | "story" | "voice";
}

interface AudioPlayerState {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isVisible: boolean;
}

interface AudioPlayerContextValue extends AudioPlayerState {
  play: (track: AudioTrack) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  stop: () => void;
  hide: () => void;
  show: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isVisible: false,
  });

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
    };
  }, []);

  const play = useCallback((track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If same track, just resume
    if (state.track?.id === track.id && state.track?.url === track.url) {
      audio.play();
      setState((prev) => ({ ...prev, isPlaying: true, isVisible: true }));
      return;
    }

    // New track
    audio.src = track.url;
    audio.play();
    setState((prev) => ({
      ...prev,
      track,
      isPlaying: true,
      currentTime: 0,
      duration: 0,
      isVisible: true,
    }));
  }, [state.track?.id, state.track?.url]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (state.track) {
      audioRef.current?.play();
    }
  }, [state.isPlaying, state.track, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      track: null,
      isVisible: false,
    }));
  }, []);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const show = useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: true }));
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        ...state,
        play,
        pause,
        toggle,
        seek,
        stop,
        hide,
        show,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
}
