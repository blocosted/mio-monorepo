"use client";

import { User, Volume2 } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mio/ui/card";
import { PlayButton } from "@/components/play-button";
import { formatDuration } from "./utils";

interface VoicesPhaseOutput {
  characters: Array<{
    characterName: string;
    voiceId?: string;
    voiceDescription: string;
  }>;
  voiceAssetIds: string[];
  voiceAssetCount: number;
}

interface AudioAssetLike {
  id: string;
  type: string;
  url: string;
  duration: number;
}

interface VoicesOutputProps {
  output: VoicesPhaseOutput;
  audioAssets?: AudioAssetLike[];
  storyTitle: string;
}

export function VoicesOutput({ output, audioAssets = [], storyTitle }: VoicesOutputProps) {
  const { characters, voiceAssetCount } = output;
  const voiceAssets = audioAssets.filter((a) => a.type === "voice");

  return (
    <div className="space-y-4">
      {/* Characters with Voice Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Voice Assignments ({characters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {characters.map((char, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
              >
                <div className="rounded-full bg-primary/10 p-2">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{char.characterName}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {char.voiceDescription}
                  </p>
                  {char.voiceId && (
                    <Badge variant="outline" className="mt-1">
                      Voice ID: {char.voiceId.slice(0, 8)}...
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voice Audio Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4" />
            Voice Assets ({voiceAssetCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {voiceAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Voice assets will appear here after generation
            </p>
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {voiceAssets.map((asset, index) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="shrink-0">
                      {index + 1}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        Segment {index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(asset.duration)}
                      </p>
                    </div>
                  </div>
                  <PlayButton
                    track={{
                      id: asset.id,
                      name: `${storyTitle} - Voice ${index + 1}`,
                      url: asset.url,
                      type: "voice",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
