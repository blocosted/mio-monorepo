import type { Meta, StoryObj } from "@storybook/react";
import { toast, Toaster as SonnerToaster } from "sonner";

import { Button } from "../primitives/button";

const meta: Meta = {
  title: "Composite/Sonner",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

function ToastDemo() {
  return (
    <div className="flex flex-col gap-2">
      <SonnerToaster />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            toast("Event has been created", {
              description: "Sunday, December 03, 2023 at 9:00 AM",
            })
          }
        >
          Show Toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Successfully saved!")}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("Something went wrong")}
        >
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning("Please check your input")}
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.info("Did you know?")}
        >
          Info
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(
              new Promise((resolve) => setTimeout(resolve, 2000)),
              {
                loading: "Loading...",
                success: "Done!",
                error: "Error!",
              }
            )
          }
        >
          Promise
        </Button>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <ToastDemo />,
};

function ToastWithAction() {
  return (
    <div>
      <SonnerToaster />
      <Button
        variant="outline"
        onClick={() =>
          toast("Event has been created", {
            description: "Sunday, December 03, 2023 at 9:00 AM",
            action: {
              label: "Undo",
              onClick: () => console.log("Undo"),
            },
          })
        }
      >
        With Action
      </Button>
    </div>
  );
}

export const WithAction: Story = {
  render: () => <ToastWithAction />,
};
