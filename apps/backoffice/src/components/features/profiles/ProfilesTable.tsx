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
import { useProfiles, type Profile } from '@/hooks/queries/use-profiles';

const columns: ColumnDef<Profile>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium text-gray-900">{row.getValue('name')}</span>
  },
  {
    id: 'gender',
    accessorKey: 'gender',
    header: 'Gender',
    cell: ({ row }) => <Badge variant="secondary">{row.getValue('gender')}</Badge>
  },
  {
    id: 'birthDate',
    accessorKey: 'birthDate',
    header: 'Birth Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('birthDate'));
      return <span className="text-gray-900 font-medium">{date.toLocaleDateString()}</span>;
    }
  },
  {
    id: 'favoriteThemes',
    accessorKey: 'favoriteThemes',
    header: 'Favorite Themes',
    cell: ({ row }) => {
      const themes = row.getValue('favoriteThemes') as string[];
      if (!themes || themes.length === 0) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {themes.slice(0, 3).map((theme) => (
            <Badge key={theme} variant="outline" className="text-xs">
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
    }
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

export function ProfilesTable() {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  const filters = useMemo(
    () => ({
      search: search || undefined,
      gender: genderFilter !== 'all' ? genderFilter : undefined
    }),
    [search, genderFilter]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useProfiles(filters);

  const profiles = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search profiles..."
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
        </div>
      </div>

      <DataTable
        columns={columns}
        data={profiles}
        isLoading={isLoading}
        emptyMessage="No profiles found."
        variant="zaant"
        columnGroups={[
          { columnIds: ['gender'], gradient: 'blue' },
          { columnIds: ['birthDate'], gradient: 'cyan' },
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
