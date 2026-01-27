import type { Meta, StoryObj } from "@storybook/react";
import { Copy, Eye, Search, X } from "lucide-react";

import { Kbd } from "../primitives/kbd";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./input-group";

const meta: Meta<typeof InputGroup> = {
  title: "Composite/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InputGroup>;

export const Default: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
};

export const WithPrefix: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
};

export const WithSuffix: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="0.00" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>USD</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithButton: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput type="password" placeholder="Enter password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton variant="ghost" size="icon-xs">
          <Eye className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithKeyboardShortcut: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <Kbd>K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithClearButton: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="Type something..." defaultValue="Hello" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton variant="ghost" size="icon-xs">
          <X className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const CopyInput: Story = {
  render: () => (
    <InputGroup className="max-w-md">
      <InputGroupInput readOnly defaultValue="https://example.com/share/abc123" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton variant="ghost" size="icon-xs">
          <Copy className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
