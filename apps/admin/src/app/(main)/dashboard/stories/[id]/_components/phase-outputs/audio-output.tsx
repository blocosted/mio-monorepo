"use client";

import { Music, Sparkles, Volume2 } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@mio/ui/card";
import { PlayButton } from "@/components/play-button";
import { formatDuration } from "./utils";

interface AudioPhaseOutput {
  sfxAssetIds: string[];
  musicAssetIds: string[];
  ambianceAssetIds: string[];
  totalAssetCount: number;
}

interface AudioAssetLike {
  id: string;
  type: string;
  url: string;
  duration: number;
}

interface AudioOutputProps {
  output: AudioPhaseOutput;
  audioAssets?: AudioAssetLike[];
  storyTitle: string;
}

function AudioAssetList({
  assets,
  type,
  storyTitle,
}: {
  assets: AudioAssetLike[];
  type: string;
  storyTitle: string;
}) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No {type} assets generated
      </p>
    );
  }

  return (
    <div className="max-h-[200px] space-y-2 overflow-y-auto">
      {assets.map((asset, index) => (
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
                {type.charAt(0).toUpperCase() + type.slice(1)} {index + 1}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(asset.duration)}
              </p>
            </div>
          </div>
          <PlayButton
            track={{
              id: asset.id,
              name: `${storyTitle} - ${type} ${index + 1}`,
              url: asset.url,
              type: type as "sfx" | "music" | "ambiance",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function AudioOutput({ output, audioAssets = [], storyTitle }: AudioOutputProps) {
  const sfxAssets = audioAssets.filter((a) => a.type === "sfx");
  const musicAssets = audioAssets.filter((a) => a.type === "music");
  const ambianceAssets = audioAssets.filter((a) => a.type === "ambiance");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audio Generation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
              <Sparkles className="mx-auto mb-1 h-5 w-5 text-yellow-600" />
              <p className="text-2xl font-bold">{output.sfxAssetIds.length}</p>
              <p className="text-xs text-muted-foreground">SFX</p>
            </div>
            <div className="rounded-lg bg-pink-50 p-3 dark:bg-pink-950/30">
              <Music className="mx-auto mb-1 h-5 w-5 text-pink-600" />
              <p className="text-2xl font-bold">{output.musicAssetIds.length}</p>
              <p className="text-xs text-muted-foreground">Music</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
              <Volume2 className="mx-auto mb-1 h-5 w-5 text-green-600" />
              <p className="text-2xl font-bold">{output.ambianceAssetIds.length}</p>
              <p className="text-xs text-muted-foreground">Ambiance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SFX Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-yellow-600" />
            Sound Effects ({sfxAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AudioAssetList assets={sfxAssets} type="sfx" storyTitle={storyTitle} />
        </CardContent>
      </Card>

      {/* Music Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Music className="h-4 w-4 text-pink-600" />
            Music ({musicAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AudioAssetList assets={musicAssets} type="music" storyTitle={storyTitle} />
        </CardContent>
      </Card>

      {/* Ambiance Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4 text-green-600" />
            Ambiance ({ambianceAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AudioAssetList assets={ambianceAssets} type="ambiance" storyTitle={storyTitle} />
        </CardContent>
      </Card>
    </div>
  );
}
