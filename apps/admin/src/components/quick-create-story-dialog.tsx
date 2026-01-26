"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@mio/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mio/ui/dialog";
import { Label } from "@mio/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mio/ui/select";
import { Textarea } from "@mio/ui/textarea";
import { useCreateStory } from "@/hooks/mutations/use-create-story";
import { useProfiles } from "@/hooks/queries/use-profiles";

interface QuickCreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCreateStoryDialog({ open, onOpenChange }: QuickCreateStoryDialogProps) {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");

  const { data: profilesData, isLoading: isLoadingProfiles } = useProfiles({});
  const profiles = profilesData?.pages.flatMap((page) => page.data) ?? [];

  const createStory = useCreateStory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileId || !prompt.trim()) {
      toast.error("Please select a profile and enter a prompt");
      return;
    }

    try {
      const story = await createStory.mutateAsync({
        childProfileId: profileId,
        prompt: prompt.trim(),
      });

      toast.success("Story created successfully");
      onOpenChange(false);
      setProfileId("");
      setPrompt("");

      // Navigate to stories page
      router.push("/dashboard/stories");
    } catch (error) {
      toast.error("Failed to create story");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setProfileId("");
      setPrompt("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Story</DialogTitle>
            <DialogDescription>
              Create a new story for a child profile. Enter a prompt to get started.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="profile">Profile</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger id="profile">
                  <SelectValue placeholder={isLoadingProfiles ? "Loading..." : "Select a profile"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.firstName} ({profile.age} ans)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prompt">Story Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Ex: A magical adventure with a brave little rabbit who discovers a hidden forest..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
                minLength={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {prompt.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createStory.isPending || !profileId || prompt.length < 3}
            >
              {createStory.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Story
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
