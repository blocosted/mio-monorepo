import type { Meta, StoryObj } from "@storybook/react";
import { siGithub, siReact, siTypescript, siTailwindcss } from "simple-icons";

import { SimpleIcon } from "./simple-icon";

const meta: Meta<typeof SimpleIcon> = {
  title: "Primitives/SimpleIcon",
  component: SimpleIcon,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SimpleIcon>;

export const Default: Story = {
  render: () => <SimpleIcon icon={siGithub} />,
};

export const Multiple: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SimpleIcon icon={siGithub} />
      <SimpleIcon icon={siReact} />
      <SimpleIcon icon={siTypescript} />
      <SimpleIcon icon={siTailwindcss} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SimpleIcon icon={siReact} className="size-4" />
      <SimpleIcon icon={siReact} className="size-5" />
      <SimpleIcon icon={siReact} className="size-6" />
      <SimpleIcon icon={siReact} className="size-8" />
      <SimpleIcon icon={siReact} className="size-12" />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SimpleIcon icon={siGithub} />
      <SimpleIcon icon={siGithub} className="fill-primary" />
      <SimpleIcon icon={siGithub} className="fill-destructive" />
      <SimpleIcon icon={siGithub} className="fill-muted-foreground" />
    </div>
  ),
};
