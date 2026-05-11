import { Monitor, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useTheme } from './useTheme';

import type { Theme } from './themeContext';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        'border-border bg-background inline-flex items-center gap-1 rounded-md border p-1',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
