'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, Tabs, PageHeader, DataTable, Badge, Button } from '@mio/shared/ui';
import { Mic, Music, BookOpen, Users, Calendar } from 'lucide-react';

const reportTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'voices', label: 'Voices' },
  { id: 'stories', label: 'Stories' },
  { id: 'usage', label: 'Usage Stats' }
];

interface RecentActivity {
  id: string;
  type: string;
  name: string;
  status: 'completed' | 'pending' | 'in_progress';
  date: string;
}

const activityColumns: ColumnDef<RecentActivity>[] = [
  {
    accessorKey: 'type',
    header: 'Type'
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = status === 'completed' ? 'default' : status === 'pending' ? 'secondary' : 'outline';
      return <Badge variant={variant}>{status}</Badge>;
    }
  },
  {
    accessorKey: 'date',
    header: 'Date'
  }
];

const sampleActivity: RecentActivity[] = [
  { id: '1', type: 'Story', name: 'The Dragon Adventure', status: 'completed', date: '2025-01-25' },
  { id: '2', type: 'Voice', name: 'Emma (French)', status: 'pending', date: '2025-01-24' },
  { id: '3', type: 'Music', name: 'Magical Forest Theme', status: 'in_progress', date: '2025-01-23' },
  { id: '4', type: 'SFX', name: 'Thunder Sounds Pack', status: 'completed', date: '2025-01-22' },
  { id: '5', type: 'Story', name: 'Space Explorers', status: 'completed', date: '2025-01-21' }
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { name: 'Voices', value: '12', icon: Mic, href: '/voices' },
    { name: 'Audio Assets', value: '156', icon: Music, href: '/audio-library/sfx' },
    { name: 'Stories', value: '48', icon: BookOpen, href: '/stories' },
    { name: 'Profiles', value: '234', icon: Users, href: '/profiles' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your Mio backoffice">
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 h-4 w-4" />
          This Month
        </Button>
      </PageHeader>

      <Tabs tabs={reportTabs} value={activeTab} onChange={setActiveTab} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <PageHeader title="Recent Activity" description="Latest updates across your content" />
            <DataTable columns={activityColumns} data={sampleActivity} variant="zaant" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
