"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Edit,
  Loader2,
  MapPin,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
  Users,
  Volume2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { PlayButton } from "@/components/play-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@mio/ui/alert-dialog";
import { Badge } from "@mio/ui/badge";
import { Button } from "@mio/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mio/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mio/ui/dialog";
import { Label } from "@mio/ui/label";
import { Separator } from "@mio/ui/separator";
import { Skeleton } from "@mio/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@mio/ui/tabs";
import { Textarea } from "@mio/ui/textarea";
import {
  useStory,
  useStoryAudioAssets,
  useStoryComputedTimeline,
  type AudioAsset,
  type ComputedTimelineResponse,
} from "@/hooks/queries/use-story";
import {
  useEnrichStory,
  useGenerateStory,
  useDeleteStory,
  useUpdateStoryPrompt,
  useRegenerateStory,
  useRemixStory,
} from "@/hooks/mutations/use-story-mutations";
import { StoryStepperView } from "./_components/story-stepper-view";

const statusConfig: Record<string, { color: string; label: string; description: string }> = {
  draft: {
    color: "bg-gray-100 text-gray-800",
    label: "Draft",
    description: "Story created, waiting for enrichment",
  },
  generating: {
    color: "bg-blue-100 text-blue-800",
    label: "Generating",
    description: "Audio generation in progress",
  },
  ready: {
    color: "bg-green-100 text-green-800",
    label: "Ready",
    description: "Story is complete and ready to play",
  },
  failed: {
    color: "bg-red-100 text-red-800",
    label: "Failed",
    description: "Generation failed",
  },
};

const assetTypeConfig: Record<string, { icon: typeof Volume2; label: string; color: string }> = {
  voice: { icon: User, label: "Voice", color: "bg-purple-100 text-purple-800" },
  sfx: { icon: Sparkles, label: "SFX", color: "bg-yellow-100 text-yellow-800" },
  music: { icon: Music, label: "Music", color: "bg-pink-100 text-pink-800" },
  ambiance: { icon: Volume2, label: "Ambiance", color: "bg-green-100 text-green-800" },
  final_mix: { icon: Play, label: "Final Mix", color: "bg-blue-100 text-blue-800" },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getScriptSegmentCount(script: unknown): number {
  if (!script || typeof script !== "object") return 0;
  const scriptData = script as { tracks?: Array<{ type?: string; segments?: unknown[] }> };
  const voiceTrack = scriptData.tracks?.find((t) => t.type === "voice");
  return voiceTrack?.segments?.length ?? 0;
}

interface StoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryDetailPage({ params }: StoryDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");

  const { data: story, isLoading, error, refetch } = useStory(id);
  const { data: audioAssets = [] } = useStoryAudioAssets(id);
  const { data: computedTimelineData } = useStoryComputedTimeline(id);

  const enrichStory = useEnrichStory();
  const generateStory = useGenerateStory();
  const deleteStory = useDeleteStory();
  const updatePrompt = useUpdateStoryPrompt();
  const regenerateStory = useRegenerateStory();
  const remixStory = useRemixStory();

  const handleRegenerate = async () => {
    try {
      await regenerateStory.mutateAsync({ storyId: id, targetDurationMinutes: 0.33 });
      toast.success("Story regeneration started");
      refetch();
    } catch {
      toast.error("Failed to regenerate story");
    }
  };

  const handleRemix = async () => {
    try {
      await remixStory.mutateAsync(id);
      toast.success("Story remixed successfully");
      refetch();
    } catch {
      toast.error("Failed to remix story");
    }
  };

  const handleEnrich = async () => {
    try {
      await enrichStory.mutateAsync(id);
      toast.success("Story enrichment started");
      refetch();
    } catch {
      toast.error("Failed to enrich story");
    }
  };

  const handleGenerate = async () => {
    try {
      await generateStory.mutateAsync({ storyId: id });
      toast.success("Story generation started");
      refetch();
    } catch {
      toast.error("Failed to start generation");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStory.mutateAsync(id);
      toast.success("Story deleted");
      router.push("/dashboard/stories");
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const handleEditPrompt = () => {
    if (story) {
      setEditedPrompt(story.initialPrompt);
      setIsEditPromptOpen(true);
    }
  };

  const handleSavePrompt = async () => {
    try {
      await updatePrompt.mutateAsync({ storyId: id, prompt: editedPrompt });
      toast.success("Prompt updated");
      setIsEditPromptOpen(false);
      refetch();
    } catch {
      toast.error("Failed to update prompt");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 min-w-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 min-w-0">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Story not found</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/stories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stories
          </Link>
        </Button>
      </div>
    );
  }

  const title = story.enrichedConcept?.title || story.initialPrompt;
  const status = statusConfig[story.status] || statusConfig.draft;
  const isDraft = story.status === "draft";
  const isEnriched = !!story.enrichedConcept;
  const isGenerating = story.status === "generating";
  const isReady = story.status === "ready";

  return (
    <div className="flex flex-1 flex-col gap-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 overflow-hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4 overflow-hidden">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/dashboard/stories">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="w-0 min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge className={status?.color ?? "bg-gray-100 text-gray-800"}>{status?.label ?? story.status}</Badge>
              {story.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(story.duration)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(story.createdAt), "MMM d, yyyy HH:mm")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{status?.description ?? ""}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {story.finalAudioUrl && (
            <PlayButton
              track={{
                id: story.id,
                name: title,
                url: story.finalAudioUrl,
                type: "story",
              }}
            />
          )}

          {isDraft && !isEnriched && (
            <Button onClick={handleEnrich} disabled={enrichStory.isPending}>
              {enrichStory.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Enrich
            </Button>
          )}

          {isDraft && isEnriched && (
            <Button onClick={handleGenerate} disabled={generateStory.isPending}>
              {generateStory.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          )}

          {isGenerating && (
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}

          {(isReady || story.status === "failed") && (
            <>
              <Button variant="outline" onClick={handleRemix} disabled={remixStory.isPending || audioAssets.length === 0}>
                {remixStory.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Music className="mr-2 h-4 w-4" />
                )}
                Remix
              </Button>
              <Button variant="outline" onClick={handleRegenerate} disabled={regenerateStory.isPending}>
                {regenerateStory.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate
              </Button>
            </>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Story</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the story and all associated audio assets.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteStory.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="workflow" className="min-w-0 flex-1">
        <TabsList>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="script" disabled={!story.script}>
            Script {getScriptSegmentCount(story.script) > 0 && `(${getScriptSegmentCount(story.script)})`}
          </TabsTrigger>
          <TabsTrigger value="audio" disabled={audioAssets.length === 0}>
            Audio {audioAssets.length > 0 && `(${audioAssets.length})`}
          </TabsTrigger>
          <TabsTrigger value="timeline" disabled={!story.script}>
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="min-w-0">
          <StoryStepperView storyId={id} storyTitle={title} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="min-w-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Original Prompt */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Original Prompt
                  </CardTitle>
                </div>
                {isDraft && (
                  <Button variant="ghost" size="sm" onClick={handleEditPrompt}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground break-words">{story.initialPrompt}</p>
              </CardContent>
            </Card>

            {/* Story Concept */}
            {story.enrichedConcept && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Story Concept
                  </CardTitle>
                  {story.enrichedConcept.synopsis && (
                    <CardDescription className="break-words">{story.enrichedConcept.synopsis}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {story.enrichedConcept.themes && story.enrichedConcept.themes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Themes</p>
                      <div className="flex flex-wrap gap-2">
                        {story.enrichedConcept.themes.map((theme) => (
                          <Badge key={theme} variant="secondary">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {story.enrichedConcept.tone && (
                    <div>
                      <p className="text-sm font-medium mb-1">Tone</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {story.enrichedConcept.tone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Character */}
            {story.enrichedConcept?.mainCharacter && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Main Character
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium break-words">{story.enrichedConcept.mainCharacter.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground break-words">
                    {story.enrichedConcept.mainCharacter.description}
                  </p>
                  {story.enrichedConcept.mainCharacter.voiceType && (
                    <Badge variant="outline" className="mt-2">
                      Voice: {story.enrichedConcept.mainCharacter.voiceType}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Secondary Characters */}
            {story.enrichedConcept?.secondaryCharacters &&
              story.enrichedConcept.secondaryCharacters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Secondary Characters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {story.enrichedConcept.secondaryCharacters.map((character, index) => (
                      <div key={index} className={index > 0 ? "pt-4 border-t" : ""}>
                        <p className="font-medium break-words">{character.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground break-words">
                          {character.description}
                        </p>
                        {character.voiceType && (
                          <Badge variant="outline" className="mt-2">
                            Voice: {character.voiceType}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

            {/* Setting */}
            {story.enrichedConcept?.setting && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Setting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground break-words">
                      {story.enrichedConcept.setting.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Era</p>
                    <p className="text-sm text-muted-foreground break-words">
                      {story.enrichedConcept.setting.era}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ambiance</p>
                    <p className="text-sm text-muted-foreground break-words">
                      {story.enrichedConcept.setting.ambiance}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Story ID</dt>
                  <dd className="font-mono text-xs truncate">{story.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Profile ID</dt>
                  <dd className="font-mono text-xs truncate">{story.childProfileId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{format(new Date(story.createdAt), "PPpp")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{format(new Date(story.updatedAt), "PPpp")}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Script Tab */}
        <TabsContent value="script" className="min-w-0 space-y-4">
          <ScriptView script={story.script} />
        </TabsContent>

        {/* Audio Tab */}
        <TabsContent value="audio" className="min-w-0 space-y-4">
          {audioAssets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No audio assets yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {audioAssets.map((asset) => (
                <AudioAssetCard key={asset.id} asset={asset} storyTitle={title} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audio Timeline</CardTitle>
              <CardDescription>
                {computedTimelineData?.computed
                  ? "Computed timeline with real audio durations"
                  : "Visual representation of the story audio mix (hypothetical timing)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScriptTimelineView
                script={story.script}
                computedTimeline={computedTimelineData}
                totalDuration={story.duration}
                finalAudioUrl={story.finalAudioUrl}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Prompt Dialog */}
      <Dialog open={isEditPromptOpen} onOpenChange={setIsEditPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>
              Modify the initial story prompt. This is only available for draft stories.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="min-h-[120px]"
                minLength={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {editedPrompt.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPromptOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={updatePrompt.isPending || editedPrompt.length < 3}
            >
              {updatePrompt.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Audio Asset Card Component
function AudioAssetCard({ asset, storyTitle }: { asset: AudioAsset; storyTitle: string }) {
  const config = assetTypeConfig[asset.type] ?? assetTypeConfig.voice;
  const Icon = config?.icon ?? Volume2;
  const label = config?.label ?? asset.type;
  const color = config?.color ?? "bg-gray-100 text-gray-800";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-md p-2 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(asset.duration)}
              </p>
            </div>
          </div>
          <PlayButton
            track={{
              id: asset.id,
              name: `${storyTitle} - ${label}`,
              url: asset.url,
              type: asset.type === "final_mix" ? "story" : asset.type as "voice" | "sfx" | "music" | "ambiance",
            }}
          />
        </div>
        {asset.cacheKey && (
          <p className="mt-2 text-xs text-muted-foreground font-mono truncate">
            {asset.cacheKey}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Script types for display
interface ScriptSegmentContent {
  type: string;
  text?: string;
  description?: string;
  characterName?: string;
  emotion?: string;
  mood?: string;
}

interface ScriptTimelineSegment {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  content: ScriptSegmentContent;
}

interface ScriptTrack {
  id: string;
  type: string;
  name: string;
  segments: ScriptTimelineSegment[];
}

interface ScriptData {
  version: number;
  metadata?: {
    title?: string;
    targetDuration?: number;
    actualDuration?: number;
    wordCount?: number;
    voiceSegmentCount?: number;
    sfxSegmentCount?: number;
  };
  characters?: Array<{
    characterName: string;
    voiceId?: string;
    voiceDescription: string;
  }>;
  tracks?: ScriptTrack[];
}

// Script View Component
function ScriptView({ script }: { script: unknown }) {
  if (!script) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No script yet</p>
        </CardContent>
      </Card>
    );
  }

  const scriptData = script as ScriptData;
  const voiceTrack = scriptData.tracks?.find((t) => t.type === "voice");
  const sfxTrack = scriptData.tracks?.find((t) => t.type === "sfx");
  const musicTrack = scriptData.tracks?.find((t) => t.type === "music");
  const ambianceTrack = scriptData.tracks?.find((t) => t.type === "ambiance");

  const voiceSegments = voiceTrack?.segments ?? [];

  return (
    <div className="space-y-6">
      {/* Script Metadata */}
      {scriptData.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Script Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              {scriptData.metadata.title && (
                <div>
                  <dt className="text-muted-foreground">Title</dt>
                  <dd className="font-medium">{scriptData.metadata.title}</dd>
                </div>
              )}
              {scriptData.metadata.targetDuration && (
                <div>
                  <dt className="text-muted-foreground">Target Duration</dt>
                  <dd>{formatDuration(scriptData.metadata.targetDuration)}</dd>
                </div>
              )}
              {scriptData.metadata.actualDuration && (
                <div>
                  <dt className="text-muted-foreground">Actual Duration</dt>
                  <dd>{formatDuration(scriptData.metadata.actualDuration)}</dd>
                </div>
              )}
              {scriptData.metadata.wordCount && (
                <div>
                  <dt className="text-muted-foreground">Word Count</dt>
                  <dd>{scriptData.metadata.wordCount}</dd>
                </div>
              )}
              {scriptData.metadata.voiceSegmentCount !== undefined && (
                <div>
                  <dt className="text-muted-foreground">Voice Segments</dt>
                  <dd>{scriptData.metadata.voiceSegmentCount}</dd>
                </div>
              )}
              {scriptData.metadata.sfxSegmentCount !== undefined && (
                <div>
                  <dt className="text-muted-foreground">SFX Segments</dt>
                  <dd>{scriptData.metadata.sfxSegmentCount}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Characters */}
      {scriptData.characters && scriptData.characters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Characters ({scriptData.characters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {scriptData.characters.map((char, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="rounded-full bg-primary/10 p-2">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{char.characterName}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{char.voiceDescription}</p>
                    {char.voiceId && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">Voice: {char.voiceId.slice(0, 8)}...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Segments */}
      {voiceSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Segments ({voiceSegments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {voiceSegments.map((segment, index) => (
              <ScriptSegmentCard key={segment.id} segment={segment} index={index} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* SFX Segments */}
      {sfxTrack && sfxTrack.segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Sound Effects ({sfxTrack.segments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {sfxTrack.segments.map((segment) => (
                <div key={segment.id} className="flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-950/30">
                  <Badge variant="outline" className="shrink-0">
                    {formatDuration(segment.startTime)}
                  </Badge>
                  <span className="text-sm truncate">{segment.content.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Music Track */}
      {musicTrack && musicTrack.segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Music ({musicTrack.segments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {musicTrack.segments.map((segment) => (
                <div key={segment.id} className="flex items-center gap-2 p-2 rounded bg-pink-50 dark:bg-pink-950/30">
                  <Badge variant="outline" className="shrink-0">
                    {formatDuration(segment.startTime)}
                  </Badge>
                  <span className="text-sm">{segment.content.mood || segment.content.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ambiance Track */}
      {ambianceTrack && ambianceTrack.segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Ambiance ({ambianceTrack.segments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {ambianceTrack.segments.map((segment) => (
                <div key={segment.id} className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/30">
                  <Badge variant="outline" className="shrink-0">
                    {formatDuration(segment.startTime)}
                  </Badge>
                  <span className="text-sm">{segment.content.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {voiceSegments.length === 0 && !sfxTrack?.segments.length && !musicTrack?.segments.length && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Script has no segments</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Script Segment Card Component
function ScriptSegmentCard({ segment, index }: { segment: ScriptTimelineSegment; index: number }) {
  const content = segment.content;
  const isDialogue = content.type === "dialogue";
  const isNarration = content.type === "narration";

  return (
    <div className={`p-3 rounded-lg border ${isDialogue ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline">{index + 1}</Badge>
        <Badge variant={isDialogue ? "secondary" : "default"} className="capitalize">
          {content.type}
        </Badge>
        {content.characterName && (
          <Badge variant="outline" className="bg-background">
            {content.characterName}
          </Badge>
        )}
        {content.emotion && (
          <Badge variant="outline" className="text-xs">
            {content.emotion}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDuration(segment.startTime)} - {formatDuration(segment.startTime + segment.duration)}
        </span>
      </div>
      {content.text && (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{content.text}</p>
      )}
    </div>
  );
}

// Computed Timeline types for display
interface ComputedTimelineSegment {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  endTime: number;
  audioAssetId?: string;
  audioUrl?: string;
  content: Record<string, unknown>;
}

interface ComputedTimelineTrack {
  id: string;
  type: string;
  name: string;
  segments: ComputedTimelineSegment[];
}

interface ComputedTimelineData {
  storyId: string;
  metadata: {
    totalDuration: number;
    computedAt: string;
    voiceSegmentPauseSeconds: number;
    voiceSegmentCount: number;
    nonVoiceSegmentCount: number;
  };
  tracks: ComputedTimelineTrack[];
}

// Script Timeline View Component
function ScriptTimelineView({
  script,
  computedTimeline,
  totalDuration,
  finalAudioUrl,
}: {
  script: unknown;
  computedTimeline?: ComputedTimelineResponse;
  totalDuration: number | null;
  finalAudioUrl: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update current time during playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const timeline = timelineRef.current;
    // Use computed timeline duration if available
    const effectiveDuration = computedTimeline?.data?.metadata?.totalDuration ?? totalDuration;
    if (!audio || !timeline || !effectiveDuration) return;

    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * effectiveDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [totalDuration, computedTimeline]);

  // Prefer computed timeline (real durations) over script (hypothetical)
  const hasComputedTimeline = computedTimeline?.computed && computedTimeline.data;
  const timelineData = hasComputedTimeline
    ? (computedTimeline.data as unknown as ComputedTimelineData)
    : null;

  if (!script && !timelineData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Music className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No timeline data available</p>
      </div>
    );
  }

  const scriptData = script as ScriptData;

  // Use computed timeline duration if available, otherwise fall back to script/totalDuration
  const duration = timelineData?.metadata.totalDuration
    ?? totalDuration
    ?? scriptData?.metadata?.actualDuration
    ?? 0;

  if (!duration) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No duration information available
      </div>
    );
  }

  // Use computed timeline tracks if available, otherwise use script tracks
  const displayTracks = timelineData?.tracks ?? scriptData?.tracks ?? [];

  const trackColors: Record<string, string> = {
    voice: "bg-blue-500",
    sfx: "bg-yellow-500",
    music: "bg-pink-500",
    ambiance: "bg-green-500",
  };

  const segmentTypeColors: Record<string, string> = {
    narration: "bg-blue-500",
    dialogue: "bg-purple-500",
    sfx: "bg-yellow-500",
    music: "bg-pink-500",
    ambiance: "bg-green-500",
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Timeline source indicator */}
      {hasComputedTimeline ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-700 dark:text-green-300">
            Showing computed timeline with real audio durations (computed {timelineData?.metadata.computedAt ? new Date(timelineData.metadata.computedAt).toLocaleString() : "recently"})
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            Showing script timeline with estimated durations (not yet computed from real audio)
          </span>
        </div>
      )}

      {/* Audio element */}
      {finalAudioUrl && (
        <audio ref={audioRef} src={finalAudioUrl} preload="metadata" />
      )}

      {/* Player controls */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
          disabled={!finalAudioUrl}
          className="h-12 w-12 rounded-full"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-mono">{formatDuration(currentTime)}</span>
            <span className="text-muted-foreground font-mono">{formatDuration(duration)}</span>
          </div>
          {/* Progress bar */}
          <div
            className="h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
            onClick={handleTimelineClick}
            ref={timelineRef}
          >
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {!finalAudioUrl && (
          <span className="text-xs text-muted-foreground">No audio available</span>
        )}
      </div>

      {/* Track visualization with cursor */}
      <div className="relative">
        {/* Progress cursor */}
        {finalAudioUrl && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none transition-all duration-100"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        )}

        {/* Tracks */}
        <div className="space-y-4">
          {displayTracks.map((track) => (
            <div key={track.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${trackColors[track.type] || "bg-gray-400"}`} />
                <span className="text-sm font-medium capitalize">{track.name || track.type}</span>
                <span className="text-xs text-muted-foreground">({track.segments.length})</span>
                {hasComputedTimeline && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Computed
                  </Badge>
                )}
              </div>
              <div
                className="relative h-10 bg-muted rounded-lg overflow-hidden cursor-pointer"
                onClick={handleTimelineClick}
              >
                {track.segments.map((segment) => {
                  const segmentContent = segment.content as ScriptSegmentContent;
                  const segmentStartTime = segment.startTime ?? 0;
                  const segmentDuration = segment.duration ?? 0;
                  const width = (segmentDuration / duration) * 100;
                  const left = (segmentStartTime / duration) * 100;
                  const color = segmentTypeColors[segmentContent.type] || trackColors[track.type] || "bg-gray-400";
                  const isActive = currentTime >= segmentStartTime && currentTime < segmentStartTime + segmentDuration;

                  return (
                    <div
                      key={segment.id}
                      className={`absolute h-full ${color} ${isActive ? "opacity-100 ring-2 ring-white ring-inset" : "opacity-70"} hover:opacity-100 transition-all`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                      title={`${segmentContent.type}: ${segmentContent.text?.slice(0, 50) || segmentContent.description || segmentContent.mood || ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>0:00</span>
        <span>{formatDuration(duration / 4)}</span>
        <span>{formatDuration(duration / 2)}</span>
        <span>{formatDuration((duration * 3) / 4)}</span>
        <span>{formatDuration(duration)}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs pt-2">
        {Object.entries(segmentTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
