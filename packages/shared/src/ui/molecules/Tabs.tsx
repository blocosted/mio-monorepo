/**
 * Tabs component
 *
 * Underline-style tab navigation component matching the Zaant design.
 */

'use client';

import * as React from 'react';

import { cn } from '../utils/cn';

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-border', className)}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors',
              value === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground',
              tab.disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-current={value === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export { Tabs, type Tab, type TabsProps };
