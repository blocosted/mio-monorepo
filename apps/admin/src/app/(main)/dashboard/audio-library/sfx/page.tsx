"use client";

import { useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Loader2, Search, Sparkles, Upload } from "lucide-react";

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
import { type SfxTrack, useSfx } from "@/hooks/queries/use-sfx";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const columns: ColumnDef<SfxTrack>[] = [
  {
    accessorKey: "canonicalKey",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.getValue("canonicalKey")}</span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue("category")}
      </Badge>
    ),
  },
  {
    accessorKey: "subcategory",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subcategory" />,
    cell: ({ row }) => {
      const value = row.getValue("subcategory") as string;
      return <span className="capitalize">{value}</span>;
    },
  },
  {
    accessorKey: "environment",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Environment" />,
    cell: ({ row }) => {
      const value = row.getValue("environment") as string | null;
      return value ? <span className="capitalize">{value}</span> : "-";
    },
  },
  {
    accessorKey: "intensity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Intensity" />,
    cell: ({ row }) => {
      const value = row.getValue("intensity") as string | null;
      return value ? <span className="capitalize">{value}</span> : "-";
    },
  },
  {
    accessorKey: "durationSeconds",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
    cell: ({ row }) => formatDuration(row.getValue("durationSeconds")),
  },
  {
    accessorKey: "usageCount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Usage" />,
    cell: ({ row }) => row.getValue("usageCount"),
  },
  {
    id: "preview",
    header: "Preview",
    cell: ({ row }) => {
      const url = row.original.s3Url;
      if (!url) return "-";
      return (
        <PlayButton
          track={{
            id: row.original.id,
            name: row.original.canonicalKey,
            url,
            type: "sfx",
          }}
        />
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return date ? format(new Date(date), "MMM d, yyyy") : "-";
    },
  },
];

export default function SfxPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useSfx({
    search: debouncedSearch,
    category: category === "all" ? undefined : category || undefined,
  });

  const tracks = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const table = useDataTableInstance({
    data: tracks,
    columns,
    getRowId: (row) => row.id,
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sound Effects Library</h1>
          <p className="text-muted-foreground">Sound effects for story enhancement</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload SFX
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sound effects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {isFetching && !isFetchingNextPage && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={category || "all"} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="nature">Nature</SelectItem>
            <SelectItem value="animals">Animals</SelectItem>
            <SelectItem value="objects">Objects</SelectItem>
            <SelectItem value="actions">Actions</SelectItem>
            <SelectItem value="magic">Magic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table} columns={columns} />
      </div>

      <DataTablePagination table={table} />

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto text-sm text-muted-foreground hover:text-foreground"
        >
          {isFetchingNextPage ? "Loading more..." : "Load more"}
        </button>
      )}
    </div>
  );
}
