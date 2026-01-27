import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../primitives/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

const meta: Meta<typeof Drawer> = {
  title: "Composite/Drawer",
  component: Drawer,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Move Goal</DrawerTitle>
          <DrawerDescription>Set your daily activity goal.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-0">
          <div className="flex items-center justify-center space-x-2">
            <Button variant="outline" size="icon">
              -
            </Button>
            <div className="flex-1 text-center">
              <div className="text-7xl font-bold tracking-tighter">350</div>
              <div className="text-sm text-muted-foreground">Calories/day</div>
            </div>
            <Button variant="outline" size="icon">
              +
            </Button>
          </div>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const RightDirection: Story = {
  render: () => (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Right</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Adjust your preferences.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Drawer content on the right side.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

export const LeftDirection: Story = {
  render: () => (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Left</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
          <DrawerDescription>Navigate the application.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <nav className="flex flex-col gap-2">
            <Button variant="ghost" className="justify-start">Home</Button>
            <Button variant="ghost" className="justify-start">Profile</Button>
            <Button variant="ghost" className="justify-start">Settings</Button>
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};
