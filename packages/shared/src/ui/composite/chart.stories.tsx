import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";

const meta: Meta = {
  title: "Composite/Chart",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "100%", minHeight: "350px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// Wrapper to ensure chart renders after mount (fixes ResponsiveContainer context issue)
function ChartWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height: "300px" }} />;
  }

  return <>{children}</>;
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export const BarChartExample: Story = {
  render: () => (
    <ChartWrapper>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <BarChart data={chartData}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
          <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
        </BarChart>
      </ChartContainer>
    </ChartWrapper>
  ),
};

export const LineChartExample: Story = {
  render: () => (
    <ChartWrapper>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <LineChart data={chartData}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="desktop"
            stroke="var(--color-desktop)"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="mobile"
            stroke="var(--color-mobile)"
            strokeWidth={2}
          />
        </LineChart>
      </ChartContainer>
    </ChartWrapper>
  ),
};

const simpleData = [
  { name: "A", value: 400 },
  { name: "B", value: 300 },
  { name: "C", value: 200 },
  { name: "D", value: 278 },
  { name: "E", value: 189 },
];

const simpleConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export const SimpleBarChart: Story = {
  render: () => (
    <ChartWrapper>
      <ChartContainer config={simpleConfig} className="h-[200px] w-full">
        <BarChart data={simpleData}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        </BarChart>
      </ChartContainer>
    </ChartWrapper>
  ),
};
