import type { Meta, StoryObj } from "@storybook/react";
import { Command } from "lucide-react";

import { Kbd, KbdGroup } from "./kbd";

const meta: Meta<typeof Kbd> = {
  title: "Primitives/Kbd",
  component: Kbd,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
  render: () => <Kbd>K</Kbd>,
};

export const WithModifier: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>
        <Command className="size-3" />
      </Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>C</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>V</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </div>
  ),
};

export const SingleKeys: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd>Enter</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
      <Kbd>Space</Kbd>
    </div>
  ),
};
