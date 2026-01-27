import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../../primitives/button";
import { AudioPlayer } from "./audio-player";
import { AudioPlayerProvider, useAudioPlayer, type AudioTrack } from "./audio-player-context";

const meta: Meta<typeof AudioPlayer> = {
  title: "Composite/AudioPlayer",
  component: AudioPlayer,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <AudioPlayerProvider>
        <div className="min-h-[200px] relative">
          <Story />
        </div>
      </AudioPlayerProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AudioPlayer>;

const sampleTracks: AudioTrack[] = [
  {
    id: "1",
    name: "Nature Sounds",
    url: "https://www.soundjay.com/nature/sounds/rain-01.mp3",
    type: "ambiance",
  },
  {
    id: "2",
    name: "Story Chapter 1",
    url: "https://www.soundjay.com/human/sounds/male-humming-1.mp3",
    type: "story",
  },
  {
    id: "3",
    name: "Background Music",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3",
    type: "music",
  },
];

function PlayButtons() {
  const { play } = useAudioPlayer();

  return (
    <div className="flex flex-wrap gap-2 p-4">
      {sampleTracks.map((track) => (
        <Button key={track.id} variant="outline" onClick={() => play(track)}>
          Play {track.name}
        </Button>
      ))}
    </div>
  );
}

function AudioPlayerDemo() {
  return (
    <>
      <PlayButtons />
      <AudioPlayer />
    </>
  );
}

export const Default: Story = {
  render: () => <AudioPlayerDemo />,
};

function SingleTrackDemo() {
  const { play } = useAudioPlayer();
  const track: AudioTrack = {
    id: "demo",
    name: "Demo Track",
    url: "https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3",
    type: "music",
  };

  return (
    <>
      <div className="p-4">
        <Button onClick={() => play(track)}>Play Demo Track</Button>
      </div>
      <AudioPlayer />
    </>
  );
}

export const SingleTrack: Story = {
  render: () => <SingleTrackDemo />,
};
