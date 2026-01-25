/**
 * SearchInput component
 *
 * An input with search icon and clear button.
 */

'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';

import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { cn } from '../utils/cn';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export function SearchInput({ value, onChange, onClear, className, placeholder = 'Search...', ...props }: SearchInputProps) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="pl-9 pr-9"
        placeholder={placeholder}
        {...props}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
