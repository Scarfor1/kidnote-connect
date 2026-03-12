import { useState, useEffect } from 'react';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { GraphView } from './GraphView';
import { ThemeSwitcherInline } from './ThemeSwitcher';
import { NoteTemplates, NoteTemplate } from './NoteTemplates';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { NoteScannerDialog } from './NoteScannerDialog';
import { FloatingActionButton } from './FloatingActionButton';
import { TutorialDialog, shouldShowTutorial } from './TutorialDialog';
import { useNotes, Note } from '@/hooks/useNotes';
import { useNoteShares, SharedNote } from '@/hooks/useNoteShares';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles, X, Network, Keyboard, Settings, HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type SelectedNote = (Note & { permission?: never }) | SharedNote;

export const AppLayout = () => {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const { sharedWithMe, loading: sharedLoading } = useNoteShares();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const [selectedNote, setSelectedNote] = useState<SelectedNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Auto-show tutorial for first-time users
  useEffect(() => {
    if (!loading && shouldShowTutorial()) {
      // Small delay so the app renders first
      const timer = setTimeout(() => setShowTutorial(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleCreateNote = async (template?: NoteTemplate) => {
    const title = template?.title || undefined;
    const content = template?.content || undefined;
    const newNote = await createNote(title, content);
    if (newNote) {
      setSelectedNote(newNote);
      if (isMobile) setSidebarOpen(false);
    }
  };

  const handleTemplateSelect = (template: NoteTemplate) => {
    handleCreateNote(template);
  };

  const handleScannedNote = async (title: string, content: string) => {
    const newNote = await createNote(title, content);
    if (newNote) {
      setSelectedNote(newNote);
      if (isMobile) setSidebarOpen(false);
    }
  };

  const handleSelectNote = (note: SelectedNote) => {
    setSelectedNote(note);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setShowGraph(false);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const handleUpdateNote = (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'is_shared'>>) => {
    updateNote(id, updates);
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  useKeyboardShortcuts([
    { key: 'n', ctrlKey: true, action: () => setShowTemplates(true), description: 'New note from template' },
    { key: 't', ctrlKey: true, action: () => setShowTemplates(true), description: 'Open templates' },
    { key: '/', ctrlKey: true, action: () => setShowShortcuts(true), description: 'Show shortcuts' },
    {
      key: 'Escape',
      action: () => { setShowShortcuts(false); setShowTemplates(false); setShowGraph(false); },
      description: 'Close dialogs',
    },
  ]);

  const isSharedNote = selectedNote && 'permission' in selectedNote;

  const handleLinkNotes = async (sourceId: string, targetId: string) => {
    const sourceNote = notes.find(n => n.id === sourceId);
    const targetNote = notes.find(n => n.id === targetId);
    if (!sourceNote || !targetNote) return;
    
    // Add [[target title]] link to source note's content if not already there
    const linkText = `[[${targetNote.title}]]`;
    if (!sourceNote.content.includes(linkText)) {
      const newContent = sourceNote.content
        ? `${sourceNote.content}\n\n${linkText}`
        : linkText;
      await updateNote(sourceId, { content: newContent });
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {showGraph && (
        <GraphView
          notes={notes}
          selectedNote={selectedNote}
          onSelectNote={handleSelectNote}
          onClose={() => setShowGraph(false)}
          onLinkNotes={handleLinkNotes}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-[85vw] max-w-80 lg:w-72 xl:w-80
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:min-w-0'}
          border-r border-sidebar-border
        `}
      >
        <div className="h-full flex flex-col">
          {/* App Header */}
          <div className="p-3.5 sm:p-4 border-b border-sidebar-border flex items-center justify-between bg-sidebar">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/15 flex items-center justify-center shadow-sm shadow-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="font-extrabold text-lg text-sidebar-foreground tracking-tight">
                Notes<span className="text-gradient">Hub</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1.5 rounded-xl">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => setShowShortcuts(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-accent/50 transition-colors hidden sm:flex"
                    >
                      <Keyboard className="w-4 h-4 text-muted-foreground" />
                      <span>Shortcuts</span>
                    </button>
                    <button
                      onClick={() => setShowGraph(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <Network className="w-4 h-4 text-muted-foreground" />
                      <span>Graph View</span>
                    </button>
                    <button
                      onClick={() => setShowTutorial(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      <span>Tutorial</span>
                    </button>
                    <div className="py-1">
                      <div className="h-px bg-border" />
                    </div>
                    <div className="px-3 py-2">
                      <ThemeSwitcherInline />
                    </div>
                    <div className="py-1">
                      <div className="h-px bg-border" />
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <NotesList
            notes={notes}
            sharedNotes={sharedWithMe}
            selectedNote={selectedNote}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onOpenTemplates={() => setShowTemplates(true)}
            loading={loading}
            sharedLoading={sharedLoading}
          />
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-16 sm:pb-0">
        <NoteEditor
          note={selectedNote}
          onUpdateNote={handleUpdateNote}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          showSidebarToggle={!sidebarOpen}
          isSharedNote={isSharedNote}
          canEdit={!isSharedNote || (selectedNote as SharedNote)?.permission === 'edit'}
          onOpenScanner={() => setShowScanner(true)}
        />
      </main>

      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <NoteTemplates open={showTemplates} onOpenChange={setShowTemplates} onSelectTemplate={handleTemplateSelect} />
      <NoteScannerDialog open={showScanner} onOpenChange={setShowScanner} onCreateNote={handleScannedNote} />
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />

      {/* Mobile FAB */}
      <FloatingActionButton
        onNewNote={() => handleCreateNote()}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenScanner={() => setShowScanner(true)}
      />
    </div>
  );
};
