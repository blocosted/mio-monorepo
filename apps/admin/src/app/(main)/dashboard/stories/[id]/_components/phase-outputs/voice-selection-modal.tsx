"use client";

import * as React from "react";
import { Search, Star, Loader2 } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Button } from "@mio/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mio/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@mio/ui/input-group";
import { Label } from "@mio/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mio/ui/select";
import { ScrollArea } from "@mio/ui/scroll-area";
import {
  SelectableCard,
  SelectableCardTitle,
  SelectableCardDescription,
} from "@mio/ui/selectable-card";
import { useInfiniteScroll } from "@mio/ui/hooks";

import { PlayButton } from "@/components/play-button";
import { useVoices } from "@/hooks/queries/use-voices";
import { useUpdateVoiceAssignments } from "@/hooks/mutations/use-phase-execution";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

import type { CharacterWithVoiceRecommendations, VoiceRecommendation } from "@mio/shared/clients/mio";

interface VoiceSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  character: CharacterWithVoiceRecommendations;
  storyLanguage: string;
  onVoiceAssigned: () => void;
  onClose: () => void;
}

export function VoiceSelectionModal({
  open,
  onOpenChange,
  storyId,
  character,
  storyLanguage,
  onVoiceAssigned,
  onClose,
}: VoiceSelectionModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [ageFilter, setAgeFilter] = React.useState<string>("all");
  const [selectedVoiceId, setSelectedVoiceId] = React.useState<string | null>(
    character.currentVoiceId ?? null
  );

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: voicesData,
    isLoading: isLoadingVoices,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVoices({
    search: debouncedSearch || undefined,
    gender: genderFilter !== "all" ? genderFilter : undefined,
    language: storyLanguage,
  });

  const updateVoiceAssignments = useUpdateVoiceAssignments();

  // Infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  });

  // Reset selection when modal opens with new character
  React.useEffect(() => {
    if (open) {
      setSelectedVoiceId(character.currentVoiceId ?? null);
      setSearchQuery("");
      setGenderFilter("all");
      setAgeFilter("all");
    }
  }, [open, character.currentVoiceId]);

  const allVoices = React.useMemo(() => {
    if (!voicesData?.pages) return [];
    return voicesData.pages.flatMap((page) => page.data ?? []);
  }, [voicesData?.pages]);

  // Filter by age on client side (since API may not support age filter)
  const filteredVoices = React.useMemo(() => {
    if (ageFilter === "all") return allVoices;
    return allVoices.filter((v) => v.age === ageFilter);
  }, [allVoices, ageFilter]);

  const handleConfirm = async () => {
    if (!selectedVoiceId) return;

    try {
      await updateVoiceAssignments.mutateAsync({
        storyId,
        voiceAssignments: [
          {
            characterName: character.characterName,
            voiceId: selectedVoiceId,
          },
        ],
      });

      toast.success("Voice assigned", {
        description: `Voice assigned to ${character.characterName}`,
      });

      onVoiceAssigned();
      onClose();
    } catch (error) {
      toast.error("Failed to assign voice", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const isRecommended = (voiceId: string) => {
    return character.recommendedVoices.some((r) => r.voiceId === voiceId);
  };

  const getMatchScore = (voiceId: string): number | null => {
    const recommendation = character.recommendedVoices.find(
      (r) => r.voiceId === voiceId
    );
    return recommendation?.matchScore ?? null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] flex-col gap-0 p-0 lg:w-[80vw] lg:max-w-none">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Select Voice for {character.characterName}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {character.voiceDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Main content - horizontal layout on large screens */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Left panel: Recommended Voices (on large screens) */}
          {character.recommendedVoices.length > 0 && (
            <div className="shrink-0 border-b p-4 lg:w-80 lg:border-b-0 lg:border-r lg:p-6">
              <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Star className="h-4 w-4 text-amber-500" />
                Recommended Voices
              </Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {character.recommendedVoices.slice(0, 4).map((voice) => (
                  <VoiceCard
                    key={voice.voiceId}
                    voice={{
                      voiceId: voice.voiceId,
                      name: voice.name,
                      gender: voice.gender ?? undefined,
                      age: voice.age ?? undefined,
                      previewUrl: voice.previewUrl ?? undefined,
                    }}
                    matchScore={voice.matchScore}
                    isSelected={selectedVoiceId === voice.voiceId}
                    isRecommended
                    onSelect={() => setSelectedVoiceId(voice.voiceId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Right panel: Search & All Voices */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Filters */}
            <div className="shrink-0 border-b bg-muted/30 p-4 lg:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <Search className="h-4 w-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Search voices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </InputGroup>
                <div className="flex gap-2">
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genders</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ageFilter} onValueChange={setAgeFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Age" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ages</SelectItem>
                      <SelectItem value="young">Young</SelectItem>
                      <SelectItem value="middle_aged">Middle aged</SelectItem>
                      <SelectItem value="old">Old</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Voice List */}
            <div className="flex min-h-0 flex-1 flex-col p-4 lg:p-6">
              <Label className="mb-3 shrink-0 text-sm font-medium">
                All Voices {filteredVoices.length > 0 && `(${filteredVoices.length})`}
              </Label>
              <ScrollArea className="h-full flex-1">
                {isLoadingVoices ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredVoices.length === 0 ? (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No voices found
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 pr-4 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredVoices.map((voice) => (
                        <VoiceCard
                          key={voice.voiceId}
                          voice={{
                            voiceId: voice.voiceId,
                            name: voice.name,
                            gender: voice.gender ?? undefined,
                            age: voice.age ?? undefined,
                            previewUrl: voice.previewUrl ?? undefined,
                          }}
                          matchScore={getMatchScore(voice.voiceId)}
                          isSelected={selectedVoiceId === voice.voiceId}
                          isRecommended={isRecommended(voice.voiceId)}
                          onSelect={() => setSelectedVoiceId(voice.voiceId)}
                        />
                      ))}
                    </div>
                    {/* Infinite scroll trigger */}
                    {hasNextPage && (
                      <div
                        ref={loadMoreRef}
                        className="flex items-center justify-center py-4"
                      >
                        {isFetchingNextPage && (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedVoiceId || updateVoiceAssignments.isPending}
          >
            {updateVoiceAssignments.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Confirm Selection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VoiceCardProps {
  voice: {
    voiceId: string;
    name: string;
    gender?: string;
    age?: string;
    previewUrl?: string;
  };
  matchScore: number | null;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}

function VoiceCard({
  voice,
  matchScore,
  isSelected,
  isRecommended,
  onSelect,
}: VoiceCardProps) {
  return (
    <SelectableCard
      size="sm"
      selected={isSelected}
      onSelect={onSelect}
      action={
        voice.previewUrl ? (
          <PlayButton
            track={{
              id: `preview-${voice.voiceId}`,
              name: `${voice.name} - Preview`,
              url: voice.previewUrl,
              type: "voice",
            }}
            size="sm"
          />
        ) : undefined
      }
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <SelectableCardTitle>{voice.name}</SelectableCardTitle>
        {isRecommended && (
          <Star className="h-3 w-3 shrink-0 text-amber-500" />
        )}
      </div>
      <SelectableCardDescription>
        {voice.gender && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] sm:px-2 sm:py-0.5 sm:text-xs">
            {voice.gender}
          </Badge>
        )}
        {voice.age && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] sm:px-2 sm:py-0.5 sm:text-xs">
            {voice.age.replace("_", " ")}
          </Badge>
        )}
        {matchScore !== null && (
          <Badge
            variant="secondary"
            className={`px-1.5 py-0 text-[10px] sm:px-2 sm:py-0.5 sm:text-xs ${
              matchScore >= 70
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : matchScore >= 40
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : ""
            }`}
          >
            {matchScore}%
          </Badge>
        )}
      </SelectableCardDescription>
    </SelectableCard>
  );
}
