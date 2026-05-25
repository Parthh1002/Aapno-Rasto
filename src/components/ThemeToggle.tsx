import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'header';
  className?: string;
}

export function ThemeToggle({ variant = 'default', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full transition-colors",
          variant === 'header' 
            ? "bg-white/10 border-white/20 hover:bg-white/20 text-white" 
            : "bg-card border-border",
          className
        )}
        aria-label="Toggle theme"
        disabled
      >
        <div className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        "rounded-full transition-all duration-300 relative overflow-hidden",
        variant === 'header' 
          ? "bg-white/10 border-white/20 hover:bg-white/20 text-white hover:text-white" 
          : "bg-card border-border hover:bg-accent/10",
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <Sun 
        className={cn(
          "h-5 w-5 transition-all duration-300 absolute",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} 
      />
      <Moon 
        className={cn(
          "h-5 w-5 transition-all duration-300 absolute",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )} 
      />
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </Button>
  );
}
