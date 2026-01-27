'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { flexRender, type ColumnDef, type Row, type Table } from '@tanstack/react-table';

import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../primitives/table';

interface VirtualRowsProps<TData, TValue> {
  virtualRows: VirtualItem[];
  rows: Row<TData>[];
  columns: ColumnDef<TData, TValue>[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
}

function VirtualRows<TData, TValue>({ virtualRows, rows, columns, virtualizer }: VirtualRowsProps<TData, TValue>) {
  if (virtualRows.length === 0) return null;

  const firstRow = virtualRows[0]!;
  const lastRow = virtualRows[virtualRows.length - 1]!;
  const paddingTop = firstRow.start;
  const paddingBottom = virtualizer.getTotalSize() - lastRow.end;

  return (
    <>
      {paddingTop > 0 && (
        <tr>
          <td colSpan={columns.length} style={{ height: paddingTop }} />
        </tr>
      )}

      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) return null;
        return (
          <TableRow
            key={row.id}
            data-index={virtualRow.index}
            data-state={row.getIsSelected() && 'selected'}
            ref={(node) => virtualizer.measureElement(node)}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        );
      })}

      {paddingBottom > 0 && (
        <tr>
          <td colSpan={columns.length} style={{ height: paddingBottom }} />
        </tr>
      )}
    </>
  );
}

interface InfiniteDataTableProps<TData, TValue> {
  table: Table<TData>;
  columns: ColumnDef<TData, TValue>[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  maxHeight?: string;
  estimateRowHeight?: number;
}

export function InfiniteDataTable<TData, TValue>({
  table,
  columns,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  maxHeight = 'calc(100vh - 280px)',
  estimateRowHeight = 53,
}: InfiniteDataTableProps<TData, TValue>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Fetch more when approaching the end
  useEffect(() => {
    const lastVirtualRow = virtualRows[virtualRows.length - 1];
    if (!lastVirtualRow) return;

    // When we're within 5 rows of the end, fetch more
    if (lastVirtualRow.index >= rows.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualRows, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-auto rounded-lg border [&_[data-slot=table-container]]:overflow-visible"
      style={{ maxHeight }}
    >
      <UITable>
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan} className="sticky top-0 z-10 bg-muted">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          ) : (
            <VirtualRows
              virtualRows={virtualRows}
              rows={rows}
              columns={columns}
              virtualizer={virtualizer}
            />
          )}
        </TableBody>
      </UITable>

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasNextPage && rows.length > 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">All items loaded</p>
      )}
    </div>
  );
}
