"use client";

import { Clock, Layers, Play } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@mio/ui/card";
import { PlayButton } from "@/components/play-button";
import { formatDuration } from "./utils";

interface ComputedTimelineMetadata {
  totalDuration: number;
  computedAt: string;
  voiceSegmentPauseSeconds: number;
  voiceSegmentCount: number;
  nonVoiceSegmentCount: number;
}

interface ComputedTimelineTrack {
  id: string;
  type: string;
  name: string;
  segments: Array<{
    id: string;
    startTime: number;
    duration: number;
    endTime: number;
  }>;
}

interface ComputedTimeline {
  storyId: string;
  metadata: ComputedTimelineMetadata;
  tracks: ComputedTimelineTrack[];
}

interface MixPhaseOutput {
  computedTimeline: ComputedTimeline;
  finalAudioUrl: string;
  durationSeconds: number;
}

interface MixOutputProps {
  output: MixPhaseOutput;
  storyTitle: string;
}

const trackColors: Record<string, string> = {
  voice: "bg-blue-500",
  sfx: "bg-yellow-500",
  music: "bg-pink-500",
  ambiance: "bg-green-500",
};

export function MixOutput({ output, storyTitle }: MixOutputProps) {
  const { computedTimeline, finalAudioUrl, durationSeconds } = output;
  const { metadata, tracks } = computedTimeline;

  return (
    <div className="space-y-4">
      {/* Final Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Final Audio Mix
          </CardTitle>
          <CardDescription>
            Total duration: {formatDuration(durationSeconds)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <PlayButton
              track={{
                id: `final-mix-${computedTimeline.storyId}`,
                name: `${storyTitle} - Final Mix`,
                url: finalAudioUrl,
                type: "story",
              }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Play Final Mix</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(durationSeconds)} total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Timeline Computed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Total Duration</dt>
              <dd className="font-medium">{formatDuration(metadata.totalDuration)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Voice Segments</dt>
              <dd className="font-medium">{metadata.voiceSegmentCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Non-Voice Segments</dt>
              <dd className="font-medium">{metadata.nonVoiceSegmentCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Voice Pause</dt>
              <dd className="font-medium">{metadata.voiceSegmentPauseSeconds}s</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Track Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Track Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tracks.map((track) => (
              <div key={track.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded ${trackColors[track.type] ?? "bg-gray-400"}`}
                  />
                  <span className="text-sm font-medium capitalize">
                    {track.name || track.type}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {track.segments.length}
                  </Badge>
                </div>
                <div className="relative h-6 overflow-hidden rounded bg-muted">
                  {track.segments.map((segment) => {
                    const width =
                      (segment.duration / metadata.totalDuration) * 100;
                    const left =
                      (segment.startTime / metadata.totalDuration) * 100;
                    return (
                      <div
                        key={segment.id}
                        className={`absolute h-full ${trackColors[track.type] ?? "bg-gray-400"} opacity-70 hover:opacity-100`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 0.5)}%`,
                        }}
                        title={`${formatDuration(segment.startTime)} - ${formatDuration(segment.endTime)}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Time axis */}
          <div className="mt-2 flex justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>0:00</span>
            <span>{formatDuration(metadata.totalDuration / 4)}</span>
            <span>{formatDuration(metadata.totalDuration / 2)}</span>
            <span>{formatDuration((metadata.totalDuration * 3) / 4)}</span>
            <span>{formatDuration(metadata.totalDuration)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
