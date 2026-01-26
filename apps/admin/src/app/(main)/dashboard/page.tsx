"use client";

import { BookOpen, Mic, Music, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@mio/ui/card";
import { useProfiles } from "@/hooks/queries/use-profiles";
import { useStories } from "@/hooks/queries/use-stories";
import { useVoices } from "@/hooks/queries/use-voices";

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: typeof Users;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isLoading ? "..." : value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: profilesData, isLoading: profilesLoading } = useProfiles();
  const { data: storiesData, isLoading: storiesLoading } = useStories();
  const { data: voicesData, isLoading: voicesLoading } = useVoices();

  const profilesCount = profilesData?.pages[0]?.data.length ?? 0;
  const storiesCount = storiesData?.pages[0]?.data.length ?? 0;
  const voicesCount = voicesData?.pages[0]?.data.length ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Mio platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Profiles"
          value={profilesCount}
          description="Child profiles created"
          icon={Users}
          isLoading={profilesLoading}
        />
        <StatsCard
          title="Total Stories"
          value={storiesCount}
          description="Stories generated"
          icon={BookOpen}
          isLoading={storiesLoading}
        />
        <StatsCard
          title="Available Voices"
          value={voicesCount}
          description="Voice options"
          icon={Mic}
          isLoading={voicesLoading}
        />
        <StatsCard
          title="Audio Assets"
          value="-"
          description="Music, SFX & Ambiance"
          icon={Music}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest stories and profile updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Activity feed coming soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Platform usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Stats charts coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
