"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Gender } from "@mio/shared/types";
import { Button } from "@mio/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mio/ui/dialog";
import { Input } from "@mio/ui/input";
import { Label } from "@mio/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mio/ui/select";
import { useCreateProfile } from "@/hooks/mutations/use-create-profile";

interface CreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
  { value: "neutral", label: "Neutral" },
];

export function CreateProfileDialog({ open, onOpenChange }: CreateProfileDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender | "">("");

  const createProfile = useCreateProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || age === "" || !gender) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createProfile.mutateAsync({
        firstName: firstName.trim(),
        age: age,
        gender: gender,
      });

      toast.success("Test profile created successfully");
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Failed to create profile");
    }
  };

  const resetForm = () => {
    setFirstName("");
    setAge("");
    setGender("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const isValid = firstName.trim().length > 0 && age !== "" && age >= 3 && age <= 12 && gender !== "";

  return (
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
              disabled={createProfile.isPending || !isValid}
            >
              {createProfile.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
