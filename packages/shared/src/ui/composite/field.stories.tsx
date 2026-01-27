import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "../primitives/checkbox";
import { Input } from "../primitives/input";
import { RadioGroup, RadioGroupItem } from "../primitives/radio-group";
import { Switch } from "../primitives/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "./field";

const meta: Meta<typeof Field> = {
  title: "Composite/Field",
  component: Field,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" type="email" placeholder="Enter your email" />
      <FieldDescription>We'll never share your email.</FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field data-invalid="true">
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <Input id="username" aria-invalid="true" defaultValue="ab" />
      <FieldError>Username must be at least 3 characters.</FieldError>
    </Field>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal">
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input id="name" placeholder="Your name" />
    </Field>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="terms" />
      <FieldContent>
        <FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
        <FieldDescription>
          You agree to our Terms of Service and Privacy Policy.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const WithSwitch: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Switch id="notifications" />
      <FieldContent>
        <FieldLabel htmlFor="notifications">Enable notifications</FieldLabel>
        <FieldDescription>
          Receive notifications about updates and new features.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const FieldGroupExample: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="first">First name</FieldLabel>
        <Input id="first" placeholder="John" />
      </Field>
      <Field>
        <FieldLabel htmlFor="last">Last name</FieldLabel>
        <Input id="last" placeholder="Doe" />
      </Field>
      <FieldSeparator>or</FieldSeparator>
      <Field>
        <FieldLabel htmlFor="company">Company name</FieldLabel>
        <Input id="company" placeholder="Acme Inc." />
      </Field>
    </FieldGroup>
  ),
};

export const FieldSetExample: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>Account Settings</FieldLegend>
      <FieldDescription>Configure your account preferences.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="display">Display name</FieldLabel>
          <Input id="display" placeholder="Your display name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Input id="bio" placeholder="Tell us about yourself" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
