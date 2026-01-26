"use client";

import { useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Loader2, Search, Star } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { InfiniteDataTable } from "@/components/data-table/infinite-data-table";
import { PlayButton } from "@/components/play-button";
import { Badge } from "@mio/ui/badge";
import { Input } from "@mio/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mio/ui/select";
import { Skeleton } from "@mio/ui/skeleton";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useDebounce } from "@/hooks/use-debounce";
import { type Voice, useVoices } from "@/hooks/queries/use-voices";

const columns: ColumnDef<Voice>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex w-32 items-center gap-2 lg:w-48">
        <span className="truncate font-medium">{row.getValue("name")}</span>
        {row.original.isHighQuality && (
          <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
        )}
      </div>
    ),
  },
  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Gender" />,
    cell: ({ row }) => (
      <div className="w-20">
        <Badge variant="outline" className="capitalize">
          {row.getValue("gender")}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "age",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Age" />,
    cell: ({ row }) => <span className="block w-16 capitalize">{row.getValue("age")}</span>,
  },
  {
    accessorKey: "language",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Language" />,
    cell: ({ row }) => <span className="block w-20">{row.getValue("language")}</span>,
  },
  {
    accessorKey: "accent",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Accent" />,
    cell: ({ row }) => <span className="block w-24 truncate lg:w-32">{row.getValue("accent") || "-"}</span>,
  },
  {
    accessorKey: "useCase",
    header: "Use Case",
    cell: ({ row }) => (
      <div className="w-24">
        <Badge variant="secondary" className="capitalize">
          {row.getValue("useCase")}
        </Badge>
      </div>
    ),
  },
  {
    id: "preview",
    header: "Preview",
    cell: ({ row }) => {
      const previewUrl = row.original.previewUrl;
      if (!previewUrl) return <span className="block w-12">-</span>;
      return (
        <div className="w-12">
          <PlayButton
            track={{
              id: row.original.id,
              name: row.original.name,
              url: previewUrl,
              type: "voice",
            }}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "lastSyncedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Synced" />,
    cell: ({ row }) => {
      const date = row.getValue("lastSyncedAt") as string;
      return <span className="block w-24">{date ? format(new Date(date), "MMM d, yyyy") : "-"}</span>;
    },
  },
];

export default function VoicesPage() {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVoices({
    search: debouncedSearch,
    gender: gender === "all" ? undefined : gender || undefined,
    language: language === "all" ? undefined : language || undefined,
  });

  const voices = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const table = useDataTableInstance({
    data: voices,
    columns,
    getRowId: (row) => row.id,
    enablePagination: false,
    defaultSorting: [{ id: 'lastSyncedAt', desc: true }],
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voices</h1>
        <p className="text-muted-foreground">Manage available voices from ElevenLabs</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search voices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {isFetching && !isFetchingNextPage && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={gender || "all"} onValueChange={setGender}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
        <Select value={language || "all"} onValueChange={setLanguage}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="it">Italian</SelectItem>
            <SelectItem value="pt">Portuguese</SelectItem>
            <SelectItem value="pl">Polish</SelectItem>
            <SelectItem value="hi">Hindi</SelectItem>
            <SelectItem value="ar">Arabic</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
            <SelectItem value="ja">Japanese</SelectItem>
            <SelectItem value="ko">Korean</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <InfiniteDataTable
        table={table}
        columns={columns}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
