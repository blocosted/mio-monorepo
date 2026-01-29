"use client";

import { CheckCircle2, Clock, Play } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@mio/ui/card";
import { PlayButton } from "@/components/play-button";
import { formatDate, formatDuration } from "./utils";

interface FinalPhaseOutput {
  status: string;
  finalAudioUrl: string;
  durationSeconds: number;
  completedAt: string;
}

interface FinalOutputProps {
  output: FinalPhaseOutput;
  storyTitle: string;
}

export function FinalOutput({ output, storyTitle }: FinalOutputProps) {
  const { status, finalAudioUrl, durationSeconds, completedAt } = output;

  return (
    <div className="space-y-4">
      {/* Success Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            Story Generation Complete
          </CardTitle>
          <CardDescription>
            Your story has been successfully generated and is ready to play
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-lg bg-background p-4">
            <PlayButton
              track={{
                id: `final-${status}`,
                name: storyTitle,
                url: finalAudioUrl,
                type: "story",
              }}
            />
            <div className="flex-1">
              <p className="font-medium">{storyTitle}</p>
              <p className="text-sm text-muted-foreground">
                Ready to play
              </p>
            </div>
            <Badge className="bg-green-500 text-white">Ready</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Final Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Final Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  {status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{formatDuration(durationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed At</dt>
              <dd className="font-medium">{formatDate(completedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Audio URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4" />
            Audio File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="break-all rounded-md bg-muted p-3 font-mono text-xs">
            {finalAudioUrl}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
