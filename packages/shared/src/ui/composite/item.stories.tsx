import type { Meta, StoryObj } from "@storybook/react";
import { File, MoreVertical, Star, Trash } from "lucide-react";

import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item";

const meta: Meta<typeof Item> = {
  title: "Composite/Item",
  component: Item,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Item>;

export const Default: Story = {
  render: () => (
    <Item className="max-w-md">
      <ItemMedia variant="icon">
        <File />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Document.pdf</ItemTitle>
        <ItemDescription>
          Last modified 2 days ago
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Item variant="outline" className="max-w-md">
      <ItemContent>
        <ItemTitle>
          Feature Request
          <Badge variant="secondary">New</Badge>
        </ItemTitle>
        <ItemDescription>
          Add dark mode support for the dashboard
        </ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const ItemGroupExample: Story = {
  render: () => (
    <ItemGroup className="max-w-md rounded-lg border">
      <Item>
        <ItemMedia variant="icon">
          <File />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Document 1</ItemTitle>
          <ItemDescription>Created yesterday</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon">
            <Star className="h-4 w-4" />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <File />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Document 2</ItemTitle>
          <ItemDescription>Created 3 days ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon">
            <Star className="h-4 w-4" />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <File />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Document 3</ItemTitle>
          <ItemDescription>Created last week</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon">
            <Trash className="h-4 w-4" />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-md">
      <Item size="sm" variant="outline">
        <ItemMedia variant="icon">
          <File />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Small Item</ItemTitle>
        </ItemContent>
      </Item>
      <Item size="default" variant="outline">
        <ItemMedia variant="icon">
          <File />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Default Item</ItemTitle>
          <ItemDescription>With description</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-md">
      <Item variant="default">
        <ItemContent>
          <ItemTitle>Default Variant</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Outline Variant</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Muted Variant</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  ),
};
