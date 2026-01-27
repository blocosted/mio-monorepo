"use client";

import * as React from "react";

import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

type UseDataTableInstanceProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  enablePagination?: boolean;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  defaultSorting?: SortingState;
  getRowId?: (row: TData, index: number) => string;
};

const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];

export function useDataTableInstance<TData, TValue>({
  data,
  columns,
  enableRowSelection = true,
  enablePagination = true,
  defaultPageIndex,
  defaultPageSize,
  defaultSorting = DEFAULT_SORTING,
  getRowId,
}: UseDataTableInstanceProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting);
  const [pagination, setPagination] = React.useState({
    pageIndex: defaultPageIndex ?? 0,
    pageSize: defaultPageSize ?? 10,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      ...(enablePagination && { pagination }),
    },
    enableRowSelection,
    getRowId: getRowId ?? ((row) => (row as any).id.toString()),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    ...(enablePagination && { onPaginationChange: setPagination }),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(enablePagination && { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return table;
}
