import { useEffect, useCallback } from 'react';

interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutAction[]) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrlKey ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export const SHORTCUT_DESCRIPTIONS = [
  { keys: 'Ctrl + N', description: 'New note' },
  { keys: 'Ctrl + S', description: 'Save note' },
  { keys: 'Ctrl + P', description: 'Toggle preview' },
  { keys: 'Ctrl + B', description: 'Bold text' },
  { keys: 'Ctrl + I', description: 'Italic text' },
  { keys: 'Ctrl + K', description: 'Insert link' },
  { keys: 'Ctrl + /', description: 'Show shortcuts' },
  { keys: 'Ctrl + T', description: 'Open templates' },
  { keys: 'Escape', description: 'Close dialogs' },
];
