import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "./calendar";

const meta: Meta<typeof Calendar> = {
  title: "Composite/Calendar",
  component: Calendar,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

export const Range: Story = {
  render: () => {
    const [date, setDate] = useState<DateRange | undefined>({
      from: new Date(2024, 0, 20),
      to: new Date(2024, 0, 25),
    });

    return (
      <Calendar
        mode="range"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
        numberOfMonths={2}
      />
    );
  },
};

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([
      new Date(2024, 0, 10),
      new Date(2024, 0, 15),
      new Date(2024, 0, 20),
    ]);

    return (
      <Calendar
        mode="multiple"
        selected={dates}
        onSelect={setDates}
        className="rounded-md border"
      />
    );
  },
};

export const WithDisabledDates: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
        disabled={(date) => date < new Date()}
      />
    );
  },
};

export const WithDropdowns: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
        captionLayout="dropdown"
      />
    );
  },
};
