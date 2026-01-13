import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SHORTCUT_DESCRIPTIONS } from '@/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog = ({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUT_DESCRIPTIONS.map(({ keys, description }) => (
            <div
              key={keys}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{description}</span>
              <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">/</kbd> to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
};
