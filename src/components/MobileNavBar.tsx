import { Button } from '@/components/ui/button';
import { FileText, Plus, Network, Settings, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileNavBarProps {
  onNewNote: () => void;
  onOpenNotes: () => void;
  onOpenGraph: () => void;
  onOpenSettings: () => void;
  activeTab: 'notes' | 'editor' | 'graph';
}

export const MobileNavBar = ({
  onNewNote,
  onOpenNotes,
  onOpenGraph,
  onOpenSettings,
  activeTab
}: MobileNavBarProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        <Button
          variant={activeTab === 'notes' ? 'soft' : 'ghost'}
          size="lg"
          onClick={onOpenNotes}
          className="flex-col gap-0.5 h-14 min-w-[64px] rounded-xl"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium">Notes</span>
        </Button>

        {/* Center FAB-style button */}
        <Button
          variant="glow"
          size="lg"
          onClick={onNewNote}
          className="h-14 w-14 rounded-2xl shadow-lg -mt-4"
        >
          <Plus className="w-6 h-6" />
        </Button>

        <Button
          variant={activeTab === 'graph' ? 'soft' : 'ghost'}
          size="lg"
          onClick={onOpenGraph}
          className="flex-col gap-0.5 h-14 min-w-[64px] rounded-xl"
        >
          <Network className="w-5 h-5" />
          <span className="text-[10px] font-medium">Graph</span>
        </Button>
      </div>
    </nav>
  );
};
