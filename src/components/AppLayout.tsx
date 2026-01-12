import { useState } from 'react';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { GraphView } from './GraphView';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useNotes, Note } from '@/hooks/useNotes';
import { useNoteShares, SharedNote } from '@/hooks/useNoteShares';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles, X, Network } from 'lucide-react';

type SelectedNote = (Note & { permission?: never }) | SharedNote;

export const AppLayout = () => {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const { sharedWithMe, loading: sharedLoading } = useNoteShares();
  const { signOut } = useAuth();
  const [selectedNote, setSelectedNote] = useState<SelectedNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGraph, setShowGraph] = useState(false);

  const handleCreateNote = async () => {
    const newNote = await createNote();
    if (newNote) {
      setSelectedNote(newNote);
    }
  };

  const handleSelectNote = (note: SelectedNote) => {
    setSelectedNote(note);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    setShowGraph(false);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const handleUpdateNote = (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'is_shared'>>) => {
    updateNote(id, updates);
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  // Check if this is a shared note (has permission property)
  const isSharedNote = selectedNote && 'permission' in selectedNote;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Graph View Modal */}
      {showGraph && (
        <GraphView
          notes={notes}
          selectedNote={selectedNote}
          onSelectNote={handleSelectNote}
          onClose={() => setShowGraph(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-80 lg:w-72 xl:w-80
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:min-w-0'}
          border-r border-sidebar-border
        `}
      >
        <div className="h-full flex flex-col">
          {/* App Header */}
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between bg-sidebar">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-sidebar-foreground">
                Notes<span className="text-primary">Hub</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Graph View Button */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowGraph(true)}
                className="text-muted-foreground hover:text-foreground"
                title="Graph View"
              >
                <Network className="w-4 h-4" />
              </Button>
              <ThemeSwitcher />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
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
      <main className="flex-1 min-w-0">
        <NoteEditor
          note={selectedNote}
          onUpdateNote={handleUpdateNote}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          showSidebarToggle={!sidebarOpen}
          isSharedNote={isSharedNote}
          canEdit={!isSharedNote || (selectedNote as SharedNote)?.permission === 'edit'}
        />
      </main>
    </div>
  );
};
