import type { Meta, StoryObj } from "@storybook/react";

import { Separator } from "./separator";
import { ScrollArea, ScrollBar } from "./scroll-area";

const meta: Meta<typeof ScrollArea> = {
  title: "Primitives/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

const tags = Array.from({ length: 50 }).map(
  (_, i) => `v1.2.0-beta.${i + 1}`
);

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

const works = [
  { artist: "Ornella Binni", art: "Reflect" },
  { artist: "Tom Byrom", art: "Mirror" },
  { artist: "Vladimir Malyavko", art: "Spring" },
  { artist: "Ornella Binni", art: "Summer" },
  { artist: "Tom Byrom", art: "Autumn" },
  { artist: "Vladimir Malyavko", art: "Winter" },
];

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {works.map((work) => (
          <figure key={work.art} className="shrink-0">
            <div className="overflow-hidden rounded-md">
              <div className="h-[150px] w-[150px] bg-muted" />
            </div>
            <figcaption className="pt-2 text-xs text-muted-foreground">
              Photo by{" "}
              <span className="font-semibold text-foreground">
                {work.artist}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};
