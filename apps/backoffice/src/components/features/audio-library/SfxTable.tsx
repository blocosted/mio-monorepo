'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SearchInput, Badge, Card, CardContent, PageHeader } from '@mio/shared/ui';

interface SfxAsset {
  id: string;
  name: string;
  category: string;
  duration: number;
  createdAt: string;
}

const columns: ColumnDef<SfxAsset>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('category')}</Badge>
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

export function SfxTable() {
  const [search, setSearch] = useState('');

  // TODO: Integrate with useInfiniteQuery once API is ready
  const data: SfxAsset[] = [];
  const isLoading = false;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <PageHeader title="Sound Effects">
            <SearchInput value={search} onChange={setSearch} placeholder="Search SFX..." className="w-64" />
          </PageHeader>

          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No SFX assets found."
            variant="zaant"
          />
        </div>
      </CardContent>
    </Card>
  );
}
