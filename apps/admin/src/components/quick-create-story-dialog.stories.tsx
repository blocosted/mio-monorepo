import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@mio/ui";

const meta: Meta = {
  title: "Admin/QuickCreateStoryDialog",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj;

// Mock profiles data
const mockProfiles = [
  { id: "1", firstName: "Emma", age: 6 },
  { id: "2", firstName: "Lucas", age: 8 },
  { id: "3", firstName: "Sophie", age: 5 },
];

interface QuickCreateStoryDialogDemoProps {
  defaultOpen?: boolean;
  isLoading?: boolean;
  isLoadingProfiles?: boolean;
}

function QuickCreateStoryDialogDemo({
  defaultOpen = false,
  isLoading = false,
  isLoadingProfiles = false,
}: QuickCreateStoryDialogDemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [profileId, setProfileId] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Storybook] Create story:", { profileId, prompt });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setProfileId("");
      setPrompt("");
    }
    setOpen(newOpen);
  };

  return (
    <>
      {!defaultOpen && (
        <Button onClick={() => setOpen(true)}>Create New Story</Button>
      )}
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
                    {mockProfiles.map((profile) => (
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
                disabled={isLoading || !profileId || prompt.length < 3}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Story
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Default: Story = {
  render: () => <QuickCreateStoryDialogDemo />,
};

export const Open: Story = {
  render: () => <QuickCreateStoryDialogDemo defaultOpen />,
};

export const Loading: Story = {
  render: () => <QuickCreateStoryDialogDemo defaultOpen isLoading />,
};

function FilledFormDemo() {
  const [open, setOpen] = useState(true);
  const [profileId, setProfileId] = useState("1");
  const [prompt, setPrompt] = useState("A magical adventure where Emma discovers a hidden garden filled with talking animals and must help them solve a mystery.");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={(e) => e.preventDefault()}>
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
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  {mockProfiles.map((profile) => (
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
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {prompt.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Story
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const WithFilledForm: Story = {
  render: () => <FilledFormDemo />,
};
