import type { Meta, StoryObj } from "@storybook/react";
import { FileX, Inbox, Search } from "lucide-react";

import { Button } from "../primitives/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";

const meta: Meta<typeof Empty> = {
  title: "Composite/Empty",
  component: Empty,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Empty>;

export const Default: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>No messages</EmptyTitle>
        <EmptyDescription>
          You don't have any messages yet. Start a conversation to see them
          here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Compose Message</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const NoResults: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>
          We couldn't find anything matching your search. Try different
          keywords.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

export const FileNotFound: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileX />
        </EmptyMedia>
        <EmptyTitle>File not found</EmptyTitle>
        <EmptyDescription>
          The file you're looking for doesn't exist or has been deleted.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">Go Back</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const Simple: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Nothing here</EmptyTitle>
        <EmptyDescription>There's no content to display.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};
