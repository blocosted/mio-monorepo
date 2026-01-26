"use client";

import { use, useState } from "react";
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
  useStorySegments,
  useStoryAudioAssets,
  type AudioAsset,
  type StorySegment,
} from "@/hooks/queries/use-story";
import {
  useEnrichStory,
  useGenerateStory,
  useDeleteStory,
  useUpdateStoryPrompt,
} from "@/hooks/mutations/use-story-mutations";

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

interface StoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryDetailPage({ params }: StoryDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");

  const { data: story, isLoading, error, refetch } = useStory(id);
  const { data: segments = [] } = useStorySegments(id);
  const { data: audioAssets = [] } = useStoryAudioAssets(id);

  const enrichStory = useEnrichStory();
  const generateStory = useGenerateStory();
  const deleteStory = useDeleteStory();
  const updatePrompt = useUpdateStoryPrompt();

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
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6">
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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/dashboard/stories">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge className={status.color}>{status.label}</Badge>
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
            <p className="mt-1 text-xs text-muted-foreground">{status.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
      <Tabs defaultValue="overview" className="flex-1">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="script" disabled={!story.script}>
            Script {segments.length > 0 && `(${segments.length})`}
          </TabsTrigger>
          <TabsTrigger value="audio" disabled={audioAssets.length === 0}>
            Audio {audioAssets.length > 0 && `(${audioAssets.length})`}
          </TabsTrigger>
          <TabsTrigger value="timeline" disabled={!isReady}>
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                <p className="text-muted-foreground">{story.initialPrompt}</p>
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
                    <CardDescription>{story.enrichedConcept.synopsis}</CardDescription>
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
                  <p className="font-medium">{story.enrichedConcept.mainCharacter.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
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
                        <p className="font-medium">{character.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
                      {story.enrichedConcept.setting.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Era</p>
                    <p className="text-sm text-muted-foreground">
                      {story.enrichedConcept.setting.era}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ambiance</p>
                    <p className="text-sm text-muted-foreground">
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
        <TabsContent value="script" className="space-y-4">
          {segments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No script segments yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {segments.map((segment, index) => (
                <SegmentCard key={segment.id} segment={segment} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Audio Tab */}
        <TabsContent value="audio" className="space-y-4">
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
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audio Timeline</CardTitle>
              <CardDescription>
                Visual representation of the story audio mix
              </CardDescription>
            </CardHeader>
            <CardContent>
              {segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Music className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No timeline data available</p>
                </div>
              ) : (
                <TimelineView segments={segments} totalDuration={story.duration} />
              )}
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

// Segment Card Component
function SegmentCard({ segment, index }: { segment: StorySegment; index: number }) {
  const content = segment.content as Record<string, unknown>;
  const text = (content.text as string) || (content.narration as string) || "";

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{index + 1}</Badge>
            <Badge variant="secondary" className="capitalize">
              {segment.type}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {segment.duration && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(segment.duration)}
              </span>
            )}
            {segment.audioUrl && (
              <PlayButton
                track={{
                  id: segment.id,
                  name: `Segment ${index + 1}`,
                  url: segment.audioUrl,
                  type: "voice",
                }}
              />
            )}
          </div>
        </div>
      </CardHeader>
      {text && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-3">{text}</p>
        </CardContent>
      )}
    </Card>
  );
}

// Audio Asset Card Component
function AudioAssetCard({ asset, storyTitle }: { asset: AudioAsset; storyTitle: string }) {
  const config = assetTypeConfig[asset.type] || assetTypeConfig.voice;
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-md p-2 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(asset.duration)}
              </p>
            </div>
          </div>
          <PlayButton
            track={{
              id: asset.id,
              name: `${storyTitle} - ${config.label}`,
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

// Timeline View Component
function TimelineView({
  segments,
  totalDuration,
}: {
  segments: StorySegment[];
  totalDuration: number | null;
}) {
  if (!totalDuration) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No duration information available
      </div>
    );
  }

  const segmentColors: Record<string, string> = {
    narration: "bg-blue-500",
    dialogue: "bg-purple-500",
    sound_effect: "bg-yellow-500",
    music_change: "bg-pink-500",
    pause: "bg-gray-300",
  };

  let currentTime = 0;

  return (
    <div className="space-y-4">
      <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
        {segments.map((segment, index) => {
          const duration = segment.duration || 0;
          const width = (duration / totalDuration) * 100;
          const left = (currentTime / totalDuration) * 100;
          currentTime += duration;

          return (
            <div
              key={segment.id}
              className={`absolute h-full ${segmentColors[segment.type] || "bg-gray-400"} opacity-80 hover:opacity-100 transition-opacity`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${segment.type}: ${formatDuration(duration)}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0:00</span>
        <span>{formatDuration(totalDuration)}</span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(segmentColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="capitalize">{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
