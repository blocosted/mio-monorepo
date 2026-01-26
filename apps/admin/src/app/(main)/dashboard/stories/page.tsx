"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ExternalLink, Loader2, Search } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { PlayButton } from "@/components/play-button";
import { Badge } from "@mio/ui/badge";
import { Button } from "@mio/ui/button";
import { Input } from "@mio/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mio/ui/select";
import { Skeleton } from "@mio/ui/skeleton";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useDebounce } from "@/hooks/use-debounce";
import { type Story, useStories } from "@/hooks/queries/use-stories";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  generating: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const columns: ColumnDef<Story>[] = [
  {
    id: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => {
      const title = row.original.enrichedConcept?.title || row.original.initialPrompt;
      return (
        <Link
          href={`/dashboard/stories/${row.original.id}`}
          className="font-medium line-clamp-1 hover:underline"
        >
          {title}
        </Link>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge className={statusColors[status] ?? "bg-gray-100 text-gray-800"}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "theme",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Theme" />,
    cell: ({ row }) => {
      const theme = row.original.enrichedConcept?.theme;
      if (!theme) return "-";
      return (
        <Badge variant="outline" className="capitalize">
          {theme}
        </Badge>
      );
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
    cell: ({ row }) => formatDuration(row.getValue("duration")),
  },
  {
    id: "audio",
    header: "Audio",
    cell: ({ row }) => {
      const url = row.original.finalAudioUrl;
      if (!url) return "-";
      const title = row.original.enrichedConcept?.title || row.original.initialPrompt;
      return (
        <PlayButton
          track={{
            id: row.original.id,
            name: title,
            url,
            type: "story",
          }}
        />
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return date ? format(new Date(date), "MMM d, yyyy HH:mm") : "-";
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/stories/${row.original.id}`}>
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];

export default function StoriesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useStories({
    search: debouncedSearch,
    status: status === "all" ? undefined : status || undefined,
  });

  const stories = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const table = useDataTableInstance({
    data: stories,
    columns,
    getRowId: (row) => row.id,
  });

  // Only show full skeleton on initial load (no data yet)
  const showSkeleton = isLoading && !data;

  if (showSkeleton) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stories</h1>
        <p className="text-muted-foreground">Manage generated stories</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={status || "all"} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={columns} />
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
