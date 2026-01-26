'use client';

import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from './data-table';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

interface InfiniteDataTableProps<TData, TValue> {
  table: Table<TData>;
  columns: ColumnDef<TData, TValue>[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  maxHeight?: string;
}

export function InfiniteDataTable<TData, TValue>({
  table,
  columns,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  maxHeight = 'calc(100vh - 280px)',
}: InfiniteDataTableProps<TData, TValue>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootRef: scrollContainerRef,
  });

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-auto rounded-lg border [&_[data-slot=table-container]]:overflow-visible"
      style={{ maxHeight }}
    >
      <DataTable table={table} columns={columns} />

      {/* Sentinel element inside scrollable area */}
      <div ref={loadMoreRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasNextPage && table.getRowModel().rows.length > 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          All items loaded
        </p>
      )}
    </div>
  );
}
