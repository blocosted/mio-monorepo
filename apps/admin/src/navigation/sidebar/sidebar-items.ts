import {
  AudioLines,
  BookOpen,
  LayoutDashboard,
  type LucideIcon,
  Mic,
  Music,
  Sparkles,
  Trees,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "Content",
    items: [
      {
        title: "Profiles",
        url: "/dashboard/profiles",
        icon: Users,
      },
      {
        title: "Stories",
        url: "/dashboard/stories",
        icon: BookOpen,
      },
      {
        title: "Voices",
        url: "/dashboard/voices",
        icon: Mic,
      },
    ],
  },
  {
    id: 3,
    label: "Audio Library",
    items: [
      {
        title: "Music",
        url: "/dashboard/audio-library/music",
        icon: Music,
      },
      {
        title: "Sound Effects",
        url: "/dashboard/audio-library/sfx",
        icon: Sparkles,
      },
      {
        title: "Ambiance",
        url: "/dashboard/audio-library/ambiance",
        icon: Trees,
      },
    ],
  },
];
