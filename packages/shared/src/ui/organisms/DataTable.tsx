/**
 * DataTable component
 *
 * A reusable data table with sorting, filtering, and cursor-based pagination.
 * Built on top of TanStack Table.
 */

'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '../atoms/Button';
import { Skeleton } from '../atoms/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { cn } from '../utils/cn';

type DataTableVariant = 'default' | 'zaant';

export interface ColumnGroup {
  columnIds: string[];
  gradient: 'blue' | 'cyan' | 'pink';
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  isFetchingNextPage?: boolean;
  emptyMessage?: string;
  variant?: DataTableVariant;
  columnGroups?: ColumnGroup[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  hasNextPage = false,
  hasPrevPage = false,
  onNextPage,
  onPrevPage,
  isFetchingNextPage = false,
  emptyMessage = 'No results.',
  variant = 'default',
  columnGroups
}: DataTableProps<TData, TValue>) {
  const isZaant = variant === 'zaant';
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility
    }
  });

  if (isLoading) {
    return (
      <div className={cn('rounded-md border', isZaant && 'rounded-xl overflow-hidden')}>
        <Table>
          <TableHeader className={cn(isZaant && 'bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end')}>
            <TableRow className={cn(isZaant && 'border-0')}>
              {columns.map((column, index) => {
                let headerClassName = '';
                if (isZaant && columnGroups) {
                  const columnId = (column as any).id;
                  const group = columnGroups.find((g) => g.columnIds.includes(columnId));
                  if (group) {
                    const gradientMap = {
                      blue: 'bg-gradient-to-br from-blue-400 to-blue-600',
                      cyan: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                      pink: 'bg-gradient-to-br from-pink-400 to-pink-600'
                    };
                    headerClassName = gradientMap[group.gradient];
                  } else {
                    headerClassName = 'bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end';
                  }
                } else if (isZaant) {
                  headerClassName = 'bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end';
                }
                return (
                  <TableHead key={index} className={cn(isZaant && 'text-white font-semibold', isZaant && headerClassName)}>
                    <Skeleton className={cn('h-4 w-24', isZaant && 'bg-white/30')} />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn('rounded-md border bg-white', isZaant && 'rounded-xl overflow-hidden border-0 shadow-lg')}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={cn(isZaant && 'border-0 hover:bg-transparent')}>
                {headerGroup.headers.map((header) => {
                  // Determine gradient for this column
                  let headerClassName = '';
                  if (isZaant && columnGroups) {
                    // Try to find group by column id or accessor key
                    const columnId = header.column.id || (header.column.columnDef as any).id;
                    const accessorKey = (header.column.columnDef as any).accessorKey;
                    const group = columnGroups.find((g) => 
                      g.columnIds.includes(columnId) || 
                      g.columnIds.includes(header.id) ||
                      (accessorKey && g.columnIds.includes(accessorKey))
                    );
                    if (group) {
                      const gradientMap = {
                        blue: 'bg-gradient-to-br from-blue-400 to-blue-600',
                        cyan: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                        pink: 'bg-gradient-to-br from-pink-400 to-pink-600'
                      };
                      headerClassName = gradientMap[group.gradient];
                    } else {
                      // Default gradient if no group specified
                      headerClassName = 'bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end';
                    }
                  } else if (isZaant) {
                    // Fallback to default gradient if no columnGroups
                    headerClassName = 'bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end';
                  }

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        isZaant && 'text-white font-semibold',
                        isZaant && headerClassName
                      )}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    isZaant && rowIndex % 2 === 0 && 'bg-gray-50',
                    'hover:bg-gray-100'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-gray-900 font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-600">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-sm text-muted-foreground">{data.length} items on this page</div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={!hasPrevPage || isFetchingNextPage}
              className={cn(!hasPrevPage && 'invisible')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
