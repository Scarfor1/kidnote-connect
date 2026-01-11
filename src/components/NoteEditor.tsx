import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Check, Copy, Menu, Sparkles, Eye, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NoteEditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'is_shared'>>) => void;
  onToggleSidebar: () => void;
  showSidebarToggle: boolean;
}

export const NoteEditor = ({
  note,
  onUpdateNote,
  onToggleSidebar,
  showSidebarToggle,
}: NoteEditorProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsPreview(false); // Reset to edit mode on note change
    }
  }, [note?.id]);

  // Debounced save
  const saveNote = useCallback(() => {
    if (note && (title !== note.title || content !== note.content)) {
      onUpdateNote(note.id, { title, content });
    }
  }, [note, title, content, onUpdateNote]);

  useEffect(() => {
    const timer = setTimeout(saveNote, 500);
    return () => clearTimeout(timer);
  }, [title, content, saveNote]);

  const handleShare = () => {
    if (note) {
      onUpdateNote(note.id, { is_shared: !note.is_shared });
      toast({
        title: note.is_shared ? 'Link disabled' : 'Sharing enabled!',
        description: note.is_shared 
          ? 'Note is now private' 
          : 'Anyone with the link can view this note',
      });
    }
  };

  const copyShareLink = () => {
    if (note) {
      const shareUrl = `${window.location.origin}/shared/${note.share_id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'Share it with anyone',
      });
    }
  };

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Ready to write?
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Select a note from the sidebar or create a new one to get started
          </p>
          <p className="text-muted-foreground/60 text-sm mt-4 max-w-sm">
            💡 Tip: Use Markdown for formatting and [[Note Title]] to link notes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="flex-1 text-xl font-bold bg-transparent border-none h-auto p-0 focus-visible:ring-0 placeholder:text-muted-foreground"
          disabled={isPreview}
        />

        {/* Preview Toggle */}
        <Button
          variant={isPreview ? 'soft' : 'ghost'}
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          className="gap-2"
        >
          {isPreview ? (
            <>
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </>
          )}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={note.is_shared ? 'soft' : 'ghost'}
              size="icon"
              className="shrink-0"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Share this note</h4>
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link can view
                  </p>
                </div>
                <Switch
                  checked={note.is_shared}
                  onCheckedChange={handleShare}
                />
              </div>

              {note.is_shared && (
                <div className="flex gap-2 animate-scale-in">
                  <Input
                    value={`${window.location.origin}/shared/${note.share_id}`}
                    readOnly
                    className="text-sm bg-secondary"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyShareLink}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto p-4">
        {isPreview ? (
          <MarkdownRenderer content={content} className="animate-fade-in" />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your thoughts... Use Markdown for formatting!"
            className="editor-content w-full text-lg leading-relaxed placeholder:text-muted-foreground/50 font-mono"
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
        <div>
          <span>Last saved {new Date(note.updated_at).toLocaleTimeString()}</span>
          <span className="mx-2">•</span>
          <span>{content.length} characters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-muted-foreground/60">
            {isPreview ? '📖 Preview mode' : '✍️ Edit mode'}
          </span>
        </div>
      </div>
    </div>
  );
};
