import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Palette } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type Theme = 'mono' | 'dark' | 'light' | 'ocean' | 'forest' | 'sunset';

const themes: { id: Theme; name: string; icon: string; colors: string }[] = [
  { id: 'mono', name: 'Mono', icon: '⚫', colors: 'bg-black' },
  { id: 'dark', name: 'Dark', icon: '🌙', colors: 'bg-zinc-900' },
  { id: 'light', name: 'Light', icon: '☀️', colors: 'bg-amber-50' },
  { id: 'ocean', name: 'Ocean', icon: '🌊', colors: 'bg-blue-900' },
  { id: 'forest', name: 'Forest', icon: '🌲', colors: 'bg-emerald-900' },
  { id: 'sunset', name: 'Sunset', icon: '🌅', colors: 'bg-orange-900' },
];

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<Theme>('mono');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') as Theme;
    if (saved && themes.find(t => t.id === saved)) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    // Also toggle class for light mode
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);
    setOpen(false);
  };

  const currentTheme = themes.find(t => t.id === theme);
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Palette;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          title="Change theme"
        >
          <Icon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 pb-1">
            Choose theme
          </p>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                transition-colors duration-200
                ${theme === t.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'hover:bg-secondary text-foreground'
                }
              `}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="font-medium">{t.name}</span>
              {theme === t.id && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
