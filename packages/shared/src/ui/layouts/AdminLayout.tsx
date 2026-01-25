/**
 * AdminLayout component
 *
 * Main layout for backoffice pages with sidebar and header.
 * Design inspired by Zaant dashboard.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mic,
  Music,
  BookOpen,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Volume2,
  Waves,
  Bell,
  Sun,
  Moon
} from 'lucide-react';

import { Button } from '../atoms/Button';
import { Avatar } from '../atoms/Avatar';
import { cn } from '../utils/cn';

export interface AdminLayoutProps {
  children: React.ReactNode;
  user?: {
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  onSignOut?: () => void;
  pageTitle?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Voices', href: '/voices', icon: Mic },
  {
    label: 'Audio Library',
    href: '/audio-library',
    icon: Music,
    children: [
      { label: 'SFX', href: '/audio-library/sfx', icon: Volume2 },
      { label: 'Ambiance', href: '/audio-library/ambiance', icon: Waves },
      { label: 'Music', href: '/audio-library/music', icon: Music }
    ]
  },
  { label: 'Stories', href: '/stories', icon: BookOpen },
  { label: 'Profiles', href: '/profiles', icon: Users }
];

export function AdminLayout({
  children,
  user,
  onSignOut,
  pageTitle,
  headerActions
}: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [audioLibraryOpen, setAudioLibraryOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // Force light mode by default
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const navItemBase =
    'flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-150';
  const navItemActive = 'bg-blue-50 text-blue-700';
  const navItemInactive =
    'text-gray-900 hover:bg-gray-50 hover:text-gray-900';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-gray-200 shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between px-6 py-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/25">
              <span className="text-xl font-bold text-white">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">Mio</span>
              <span className="text-xs font-medium text-gray-500">
                Backoffice
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-4 py-4">
          {navigation.map((item) => {
            const isActive = isActiveRoute(item.href);
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
              const isChildActive = item.children?.some((child) =>
                pathname.startsWith(child.href)
              );
              const isExpanded = audioLibraryOpen || isChildActive;

              return (
                <div key={item.href} className="space-y-1">
                  <button
                    onClick={() => setAudioLibraryOpen(!audioLibraryOpen)}
                    className={cn(
                      navItemBase,
                      'w-full justify-between',
                      isChildActive ? navItemActive : navItemInactive
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'ml-4 space-y-1 overflow-hidden transition-all duration-200',
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    {item.children?.map((child) => {
                      const isChildItemActive = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            navItemBase,
                            'py-3',
                            isChildItemActive ? navItemActive : navItemInactive
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(navItemBase, isActive ? navItemActive : navItemInactive)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-200 px-4 py-6 space-y-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(navItemBase, navItemInactive, 'w-full')}
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {/* User */}
          {user && (
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar
                src={user.avatarUrl}
                name={user.name || user.email}
                size="md"
                className="ring-2 ring-gray-100"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                title="Sign out"
                className="text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {pageTitle && (
              <h1 className="text-xl font-semibold text-gray-900">
                {pageTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {headerActions}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-500 hover:text-gray-700"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                3
              </span>
            </Button>
            {user && (
              <Avatar
                src={user.avatarUrl}
                name={user.name || user.email}
                size="sm"
                className="hidden lg:flex ml-2 ring-2 ring-gray-100"
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-8 bg-gray-100">{children}</main>
      </div>
    </div>
  );
}
