import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Camera, LayoutTemplate, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onNewNote: () => void;
  onOpenTemplates: () => void;
  onOpenScanner: () => void;
}

export const FloatingActionButton = ({
  onNewNote,
  onOpenTemplates,
  onOpenScanner
}: FloatingActionButtonProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const actions = [
    { icon: Camera, label: 'Scan Notes', onClick: onOpenScanner, color: 'bg-accent text-accent-foreground' },
    { icon: LayoutTemplate, label: 'Templates', onClick: onOpenTemplates, color: 'bg-secondary text-secondary-foreground' },
    { icon: FileText, label: 'New Note', onClick: onNewNote, color: 'bg-primary text-primary-foreground' },
  ];

  return (
    <div className="fixed right-4 bottom-20 z-40 flex flex-col-reverse items-end gap-3">
      {/* Action buttons */}
      {isExpanded && (
        <div className="flex flex-col-reverse gap-3 animate-scale-in">
          {actions.map((action, index) => (
            <div 
              key={action.label}
              className="flex items-center gap-2 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-sm font-medium bg-popover text-popover-foreground px-3 py-1.5 rounded-lg shadow-lg">
                {action.label}
              </span>
              <Button
                size="lg"
                className={cn("h-12 w-12 rounded-full shadow-lg", action.color)}
                onClick={() => {
                  action.onClick();
                  setIsExpanded(false);
                }}
              >
                <action.icon className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <Button
        size="lg"
        variant="glow"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-transform duration-200",
          isExpanded && "rotate-45"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </Button>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};
