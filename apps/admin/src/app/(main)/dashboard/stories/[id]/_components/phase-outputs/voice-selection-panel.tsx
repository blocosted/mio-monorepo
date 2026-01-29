"use client";

import * as React from "react";
import { User, Volume2, Star, RefreshCw, Check } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Button } from "@mio/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@mio/ui/card";
import { Skeleton } from "@mio/ui/skeleton";

import { PlayButton } from "@/components/play-button";
import { useStoryCharacters } from "@/hooks/queries/use-story";
import { VoiceSelectionModal } from "./voice-selection-modal";

import type { CharacterWithVoiceRecommendations, VoiceRecommendation } from "@mio/shared/clients/mio";

interface VoiceSelectionPanelProps {
  storyId: string;
  onVoiceAssigned?: () => void;
}

export function VoiceSelectionPanel({
  storyId,
  onVoiceAssigned,
}: VoiceSelectionPanelProps) {
  const { data, isLoading, error, refetch } = useStoryCharacters(storyId);
  const [selectedCharacter, setSelectedCharacter] = React.useState<CharacterWithVoiceRecommendations | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Voice Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Voice Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load characters. Please ensure the concept phase is completed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Voice Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No characters found. Complete the concept phase first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleOpenModal = (character: CharacterWithVoiceRecommendations) => {
    setSelectedCharacter(character);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCharacter(null);
  };

  const handleVoiceAssigned = () => {
    refetch();
    onVoiceAssigned?.();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Voice Selection ({data.data.length} characters)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.data.map((character) => (
              <CharacterVoiceRow
                key={character.characterName}
                character={character}
                onChangeVoice={() => handleOpenModal(character)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCharacter && (
        <VoiceSelectionModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          storyId={storyId}
          character={selectedCharacter}
          storyLanguage={data.storyLanguage}
          onVoiceAssigned={handleVoiceAssigned}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

interface CharacterVoiceRowProps {
  character: CharacterWithVoiceRecommendations;
  onChangeVoice: () => void;
}

function CharacterVoiceRow({
  character,
  onChangeVoice,
}: CharacterVoiceRowProps) {
  const hasVoice = !!character.currentVoiceId;
  const topRecommendation = character.recommendedVoices[0];

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      {/* Character Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <User className="h-6 w-6 text-primary" />
      </div>

      {/* Character Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{character.characterName}</p>
          {hasVoice && (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Assigned
            </Badge>
          )}
        </div>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {character.voiceDescription}
        </p>

        {/* Current Voice */}
        {character.currentVoice && (
          <div className="mt-2 flex items-center gap-2">
            <Volume2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {character.currentVoice.name}
            </span>
            {character.currentVoice.previewUrl && (
              <PlayButton
                track={{
                  id: `preview-${character.currentVoiceId}`,
                  name: `${character.currentVoice.name} - Preview`,
                  url: character.currentVoice.previewUrl,
                  type: "voice",
                }}
                size="sm"
              />
            )}
            {character.currentVoice.gender && (
              <Badge variant="outline" className="text-xs">
                {character.currentVoice.gender}
              </Badge>
            )}
            {character.currentVoice.age && (
              <Badge variant="outline" className="text-xs">
                {character.currentVoice.age}
              </Badge>
            )}
          </div>
        )}

        {/* Top Recommendation (when no voice assigned) */}
        {!hasVoice && topRecommendation && (
          <div className="mt-2 flex items-center gap-2">
            <Star className="h-3 w-3 text-amber-500" />
            <span className="text-sm text-muted-foreground">
              Recommended: {topRecommendation.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {topRecommendation.matchScore}% match
            </Badge>
          </div>
        )}
      </div>

      {/* Change Button */}
      <Button variant="outline" size="sm" onClick={onChangeVoice}>
        {hasVoice ? "Change" : "Select"}
      </Button>
    </div>
  );
}
