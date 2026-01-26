"use client";

import { useMemo, useState } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Loader2, Plus, Search } from "lucide-react";

import { CreateProfileDialog } from "@/components/create-profile-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Badge } from "@mio/ui/badge";
import { Button } from "@mio/ui/button";
import { Input } from "@mio/ui/input";
import { Skeleton } from "@mio/ui/skeleton";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useDebounce } from "@/hooks/use-debounce";
import { type Profile, useProfiles } from "@/hooks/queries/use-profiles";

const columns: ColumnDef<Profile>[] = [
  {
    accessorKey: "firstName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("firstName")}</span>,
  },
  {
    accessorKey: "age",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Age" />,
    cell: ({ row }) => {
      const age = row.getValue("age") as number;
      return age ? `${age} years` : "-";
    },
  },
  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Gender" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue("gender")}
      </Badge>
    ),
  },
  {
    id: "themes",
    header: "Favorite Themes",
    cell: ({ row }) => {
      const preferences = row.original.preferences as { favoriteThemes?: string[] } | null;
      const themes = preferences?.favoriteThemes ?? [];
      if (themes.length === 0) return "-";
      return (
        <div className="flex flex-wrap gap-1">
          {themes.slice(0, 3).map((theme: string) => (
            <Badge key={theme} variant="secondary" className="text-xs">
              {theme}
            </Badge>
          ))}
          {themes.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{themes.length - 3}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return date ? format(new Date(date), "MMM d, yyyy") : "-";
    },
  },
];

export default function ProfilesPage() {
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useProfiles({
    search: debouncedSearch,
  });

  const profiles = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const table = useDataTableInstance({
    data: profiles,
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profiles</h1>
        <p className="text-muted-foreground">Manage child profiles</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {isFetching && !isFetchingNextPage && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Test Profile
        </Button>
      </div>

      <CreateProfileDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

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
