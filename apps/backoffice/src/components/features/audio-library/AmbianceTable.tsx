'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SearchInput, Badge, Card, CardContent, PageHeader } from '@mio/shared/ui';

interface AmbianceAsset {
  id: string;
  name: string;
  environment: string;
  mood: string;
  duration: number;
  createdAt: string;
}

const columns: ColumnDef<AmbianceAsset>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'environment',
    header: 'Environment',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('environment')}</Badge>
  },
  {
    accessorKey: 'mood',
    header: 'Mood',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('mood')}</Badge>
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const seconds = row.getValue('duration') as number;
      return `${seconds}s`;
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created'
  }
];

export function AmbianceTable() {
  const [search, setSearch] = useState('');

  // TODO: Integrate with useInfiniteQuery once API is ready
  const data: AmbianceAsset[] = [];
  const isLoading = false;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <PageHeader title="Ambiance">
            <SearchInput value={search} onChange={setSearch} placeholder="Search ambiance..." className="w-64" />
          </PageHeader>

          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No ambiance assets found."
            variant="zaant"
          />
        </div>
      </CardContent>
    </Card>
  );
}
