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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mio/ui";

type Gender = "boy" | "girl" | "neutral";

const meta: Meta = {
  title: "Admin/CreateProfileDialog",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj;

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
  { value: "neutral", label: "Neutral" },
];

interface CreateProfileDialogDemoProps {
  defaultOpen?: boolean;
  isLoading?: boolean;
}

function CreateProfileDialogDemo({ defaultOpen = false, isLoading = false }: CreateProfileDialogDemoProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender | "">("");

  const resetForm = () => {
    setFirstName("");
    setAge("");
    setGender("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Storybook] Submit:", { firstName, age, gender });
  };

  const isValid = firstName.trim().length > 0 && age !== "" && Number(age) >= 3 && Number(age) <= 12 && gender !== "";

  return (
    <>
      {!defaultOpen && (
        <Button onClick={() => setOpen(true)}>Create Test Profile</Button>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Test Profile</DialogTitle>
              <DialogDescription>
                Create a new test profile for story generation testing.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={50}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="3-12"
                  value={age}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAge(val === "" ? "" : parseInt(val, 10));
                  }}
                  min={3}
                  max={12}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                disabled={isLoading || !isValid}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Default: Story = {
  render: () => <CreateProfileDialogDemo />,
};

export const Open: Story = {
  render: () => <CreateProfileDialogDemo defaultOpen />,
};

export const Loading: Story = {
  render: () => <CreateProfileDialogDemo defaultOpen isLoading />,
};
