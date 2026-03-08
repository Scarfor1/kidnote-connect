import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Palette } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type Theme = 'mono' | 'dark' | 'light' | 'ocean' | 'forest' | 'sunset';

const themes: { id: Theme; name: string; icon: string }[] = [
  { id: 'mono', name: 'Mono', icon: '⚫' },
  { id: 'dark', name: 'Dark', icon: '🌙' },
  { id: 'light', name: 'Light', icon: '☀️' },
  { id: 'ocean', name: 'Ocean', icon: '🌊' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'sunset', name: 'Sunset', icon: '🌅' },
];

const applyTheme = (newTheme: Theme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
  if (newTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
};

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('mono');

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') as Theme;
    if (saved && themes.find(t => t.id === saved)) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);
  };

  return { theme, changeTheme };
};

export const ThemeSwitcher = () => {
  const { theme, changeTheme } = useTheme();
  const [open, setOpen] = useState(false);
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
              onClick={() => { changeTheme(t.id); setOpen(false); }}
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

/** Inline theme picker for embedding in settings menus */
export const ThemeSwitcherInline = () => {
  const { theme, changeTheme } = useTheme();

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Theme</p>
      <div className="grid grid-cols-3 gap-1.5">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTheme(t.id)}
            className={`
              flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs
              transition-colors duration-200
              ${theme === t.id 
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30' 
                : 'hover:bg-secondary text-foreground'
              }
            `}
            title={t.name}
          >
            <span className="text-base">{t.icon}</span>
            <span className="font-medium text-[10px]">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
