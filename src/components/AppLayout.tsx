import { useState } from 'react';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { useNotes, Note } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles, X } from 'lucide-react';

export const AppLayout = () => {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const { user, signOut } = useAuth();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCreateNote = async () => {
    const newNote = await createNote();
    if (newNote) {
      setSelectedNote(newNote);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
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

  return (
    <div className="h-screen flex overflow-hidden bg-background">
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
            <div className="flex items-center gap-2">
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
            selectedNote={selectedNote}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            loading={loading}
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
        />
      </main>
    </div>
  );
};
