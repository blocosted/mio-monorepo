'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SearchInput, Badge, Card, CardContent, PageHeader } from '@mio/shared/ui';

interface MusicAsset {
  id: string;
  name: string;
  mood: string;
  genre: string;
  duration: number;
  createdAt: string;
}

const columns: ColumnDef<MusicAsset>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'mood',
    header: 'Mood',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('mood')}</Badge>
  },
  {
    accessorKey: 'genre',
    header: 'Genre',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('genre')}</Badge>
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const seconds = row.getValue('duration') as number;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created'
  }
];

export function MusicTable() {
  const [search, setSearch] = useState('');

  // TODO: Integrate with useInfiniteQuery once API is ready
  const data: MusicAsset[] = [];
  const isLoading = false;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <PageHeader title="Music">
            <SearchInput value={search} onChange={setSearch} placeholder="Search music..." className="w-64" />
          </PageHeader>

          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No music assets found."
            variant="zaant"
          />
        </div>
      </CardContent>
    </Card>
  );
}
