import { Note } from '@/hooks/useNotes';
import { SharedNote } from '@/hooks/useNoteShares';
import { Plus, Search, FileText, Share2, Trash2, Users, Eye, Edit3, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NotesListProps {
  notes: Note[];
  sharedNotes: SharedNote[];
  selectedNote: Note | SharedNote | null;
  onSelectNote: (note: Note | SharedNote) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onOpenTemplates: () => void;
  loading: boolean;
  sharedLoading: boolean;
}

export const NotesList = ({
  notes,
  sharedNotes,
  selectedNote,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onOpenTemplates,
  loading,
  sharedLoading,
}: NotesListProps) => {
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSharedNotes = sharedNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-extrabold text-sidebar-foreground flex-1 tracking-tight">My Notes</h2>
          <Button
            onClick={onOpenTemplates}
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-muted-foreground hover:text-foreground"
            title="Templates (Ctrl+T)"
          >
            <LayoutTemplate className="w-4 h-4" />
          </Button>
          <Button
            onClick={onCreateNote}
            variant="glow"
            size="icon-sm"
            className="rounded-lg"
            title="New note (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-sidebar-accent border-2 border-sidebar-border text-sidebar-foreground placeholder:text-muted-foreground rounded-xl"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search ? 'No notes found' : 'No notes yet'}
            </p>
            {!search && (
              <Button
                onClick={onCreateNote}
                variant="soft"
                size="sm"
                className="mt-3"
              >
                <Plus className="w-4 h-4" />
                Create your first note
              </Button>
            )}
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <div
              key={note.id}
              className={`note-card group animate-slide-up ${
                selectedNote?.id === note.id ? 'active' : ''
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => onSelectNote(note)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground truncate">
                    {note.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {note.content || 'Empty note...'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                    {note.is_shared && (
                      <span className="flex items-center gap-1 text-primary">
                        <Share2 className="w-3 h-3" />
                        Shared
                      </span>
                    )}
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{note.title || 'Untitled'}". This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}

        {/* Shared with me section */}
        {filteredSharedNotes.length > 0 && (
          <>
            <div className="flex items-center gap-2 py-2 mt-4 border-t border-sidebar-border">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shared with me
              </span>
            </div>
            {filteredSharedNotes.map((note, index) => (
              <div
                key={note.id}
                className={`note-card group animate-slide-up ${
                  selectedNote?.id === note.id ? 'active' : ''
                }`}
                style={{ animationDelay: `${(filteredNotes.length + index) * 0.05}s` }}
                onClick={() => onSelectNote(note)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">
                      {note.title || 'Untitled'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {note.content || 'Empty note...'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1 text-primary">
                        {note.permission === 'edit' ? (
                          <>
                            <Edit3 className="w-3 h-3" />
                            Can edit
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            View only
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {sharedLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};
