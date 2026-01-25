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
import { useVoices, type Voice } from '@/hooks/queries/use-voices';

const columns: ColumnDef<Voice>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <div className="font-medium truncate">{row.getValue('name')}</div>
        <div className="text-xs text-muted-foreground truncate">{row.original.voiceId}</div>
      </div>
    )
  },
  {
    accessorKey: 'gender',
    header: 'Gender',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('gender')}</Badge>
  },
  {
    accessorKey: 'age',
    header: 'Age',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('age')}</Badge>
  },
  {
    accessorKey: 'language',
    header: 'Language',
    cell: ({ row }) => (
      <div>
        <div>{row.original.language.toUpperCase()}</div>
        <div className="text-xs text-muted-foreground">{row.original.accent}</div>
      </div>
    )
  },
  {
    accessorKey: 'useCase',
    header: 'Use Case',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('useCase')}</Badge>
  },
  {
    accessorKey: 'isHighQuality',
    header: 'Quality',
    cell: ({ row }) =>
      row.getValue('isHighQuality') ? (
        <Badge className="bg-green-100 text-green-800">High Quality</Badge>
      ) : (
        <Badge variant="secondary">Standard</Badge>
      )
  }
];

export function VoicesTable() {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  const filters = useMemo(
    () => ({
      search: search || undefined,
      gender: genderFilter !== 'all' ? genderFilter : undefined,
      language: languageFilter !== 'all' ? languageFilter : undefined
    }),
    [search, genderFilter, languageFilter]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useVoices(filters);

  const voices = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search voices..."
          className="w-full sm:w-64"
        />
        <div className="flex gap-2">
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable columns={columns} data={voices} isLoading={isLoading} emptyMessage="No voices found." />

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
