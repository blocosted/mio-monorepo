'use client';

import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  DataTable,
  SearchInput,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@mio/shared/ui';
import { useStories, type Story } from '@/hooks/queries/use-stories';

const columns: ColumnDef<Story>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => <span className="font-semibold text-gray-900">{row.getValue('title')}</span>
  },
  {
    id: 'theme',
    accessorKey: 'theme',
    header: 'Theme',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('theme')}</Badge>
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
        completed: { variant: 'default', className: 'bg-green-100 text-green-900 border-green-300 font-semibold' },
        ready: { variant: 'default', className: 'bg-green-100 text-green-900 border-green-300 font-semibold' },
        pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-900 border-yellow-300 font-semibold' },
        generating: { variant: 'secondary', className: 'bg-blue-100 text-blue-900 border-blue-300 font-semibold' },
        draft: { variant: 'outline', className: 'bg-gray-200 text-gray-900 border-gray-400 font-semibold' },
        failed: { variant: 'destructive', className: 'bg-red-100 text-red-900 border-red-300 font-semibold' }
      };
      
      const statusConfig = statusMap[status.toLowerCase()] || { variant: 'outline' as const, className: 'bg-gray-200 text-gray-900 border-gray-400 font-semibold' };
      
      return (
        <Badge variant={statusConfig.variant} className={statusConfig.className}>
          {status}
        </Badge>
      );
    }
  },
  {
    id: 'duration',
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => <span className="text-gray-900 font-medium">{row.getValue('duration')}</span>
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return <span className="text-gray-900 font-medium">{date.toLocaleDateString()}</span>;
    }
  }
];

export function StoriesTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    [search, statusFilter]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useStories(filters);

  const stories = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search stories..."
          className="w-full sm:w-64"
        />
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={stories}
        isLoading={isLoading}
        emptyMessage="No stories found."
        variant="zaant"
        columnGroups={[
          { columnIds: ['status'], gradient: 'blue' },
          { columnIds: ['duration'], gradient: 'cyan' },
          { columnIds: ['createdAt'], gradient: 'pink' }
        ]}
      />

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading more...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
