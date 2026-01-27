import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { useDataTableInstance } from "../../hooks/use-data-table-instance";
import { Badge } from "../../primitives/badge";
import { Checkbox } from "../../primitives/checkbox";
import { DataTable } from "./data-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";
import { dragColumn } from "./drag-column";
import { InfiniteDataTable } from "./infinite-data-table";

interface Payment {
  id: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  email: string;
}

const sampleData: Payment[] = [
  { id: "1", amount: 316, status: "success", email: "ken@example.com" },
  { id: "2", amount: 242, status: "success", email: "abe@example.com" },
  { id: "3", amount: 837, status: "processing", email: "john@example.com" },
  { id: "4", amount: 874, status: "success", email: "jane@example.com" },
  { id: "5", amount: 721, status: "failed", email: "mark@example.com" },
  { id: "6", amount: 516, status: "success", email: "lisa@example.com" },
  { id: "7", amount: 444, status: "pending", email: "bob@example.com" },
  { id: "8", amount: 612, status: "success", email: "alice@example.com" },
  { id: "9", amount: 298, status: "processing", email: "dave@example.com" },
  { id: "10", amount: 950, status: "success", email: "eva@example.com" },
];

const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "success" ? "default" : status === "failed" ? "destructive" : "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
];

function DataTableExample() {
  const table = useDataTableInstance({
    data: sampleData,
    columns,
    defaultSorting: [{ id: "email", desc: false }],
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <DataTable table={table} columns={columns} />
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

const meta: Meta<typeof DataTable> = {
  title: "Composite/DataTable",
  component: DataTable,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const Default: Story = {
  render: () => <DataTableExample />,
};

// Data with numeric IDs for DnD (required by dnd-kit)
interface DnDPayment extends Omit<Payment, "id"> {
  id: number;
}

const dndSampleData: DnDPayment[] = sampleData.map((item, index) => ({
  ...item,
  id: index + 1,
}));

// Columns with drag handle for DnD example
const dndColumns: ColumnDef<DnDPayment>[] = [
  dragColumn as ColumnDef<DnDPayment>,
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "success" ? "default" : status === "failed" ? "destructive" : "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
];

function DataTableWithDnDExample() {
  const [data, setData] = useState(dndSampleData);
  const table = useDataTableInstance({
    data,
    columns: dndColumns,
    defaultSorting: [],
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <DataTable
          table={table}
          columns={dndColumns}
          dndEnabled
          onReorder={setData}
        />
      </div>
    </div>
  );
}

export const WithDragAndDrop: Story = {
  render: () => <DataTableWithDnDExample />,
};

function DataTableWithViewOptionsExample() {
  const table = useDataTableInstance({
    data: sampleData,
    columns,
    defaultSorting: [{ id: "email", desc: false }],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DataTableViewOptions table={table} />
      </div>
      <div className="rounded-md border">
        <DataTable table={table} columns={columns} />
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

export const WithViewOptions: Story = {
  render: () => <DataTableWithViewOptionsExample />,
};

// Generate more data for infinite scroll
const generateLargeDataset = (count: number): Payment[] => {
  const statuses: Payment["status"][] = ["pending", "processing", "success", "failed"];
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    amount: Math.floor(Math.random() * 1000) + 100,
    status: statuses[Math.floor(Math.random() * statuses.length)]!,
    email: `user${i + 1}@example.com`,
  }));
};

function InfiniteDataTableExample() {
  const [data, setData] = useState(() => generateLargeDataset(20));
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const table = useDataTableInstance({
    data,
    columns: columns.slice(1), // Exclude select for simplicity
    defaultSorting: [],
  });

  const fetchNextPage = () => {
    if (isFetchingNextPage || !hasNextPage) return;

    setIsFetchingNextPage(true);

    // Simulate API call
    setTimeout(() => {
      const newData = generateLargeDataset(20);
      const newDataWithOffset = newData.map((item, i) => ({
        ...item,
        id: String(data.length + i + 1),
        email: `user${data.length + i + 1}@example.com`,
      }));

      setData((prev) => [...prev, ...newDataWithOffset]);
      setIsFetchingNextPage(false);

      // Stop after 100 items
      if (data.length + 20 >= 100) {
        setHasNextPage(false);
      }
    }, 1000);
  };

  return (
    <InfiniteDataTable
      table={table}
      columns={columns.slice(1)}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      maxHeight="400px"
    />
  );
}

export const InfiniteScroll: Story = {
  render: () => <InfiniteDataTableExample />,
};

function EmptyDataTableExample() {
  const table = useDataTableInstance({
    data: [],
    columns,
    defaultSorting: [],
  });

  return (
    <div className="rounded-md border">
      <DataTable table={table} columns={columns} />
    </div>
  );
}

export const Empty: Story = {
  render: () => <EmptyDataTableExample />,
};
