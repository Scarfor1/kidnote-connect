import { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Check, Copy, Menu, Sparkles, Eye, Edit3, Users, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MarkdownToolbar } from './MarkdownToolbar';
import { ShareDialog } from './ShareDialog';

interface BaseNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

interface NoteEditorProps {
  note: BaseNote | null;
  onUpdateNote: (id: string, updates: Partial<Pick<BaseNote, 'title' | 'content'>>) => void;
  onToggleSidebar: () => void;
  showSidebarToggle: boolean;
  isSharedNote?: boolean;
  canEdit?: boolean;
}

// Type guard to check if note is a full Note
const isFullNote = (note: BaseNote): note is Note => {
  return 'is_shared' in note && 'share_id' in note;
};

export const NoteEditor = ({
  note,
  onUpdateNote,
  onToggleSidebar,
  showSidebarToggle,
  isSharedNote = false,
  canEdit = true,
}: NoteEditorProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      // Set to preview mode for view-only shared notes
      setIsPreview(isSharedNote && !canEdit);
    }
  }, [note?.id, isSharedNote, canEdit]);

  // Debounced save
  const saveNote = useCallback(() => {
    if (note && canEdit && (title !== note.title || content !== note.content)) {
      onUpdateNote(note.id, { title, content });
    }
  }, [note, title, content, onUpdateNote, canEdit]);

  useEffect(() => {
    const timer = setTimeout(saveNote, 500);
    return () => clearTimeout(timer);
  }, [title, content, saveNote]);

  const handleShare = () => {
    if (note && isFullNote(note)) {
      onUpdateNote(note.id, { is_shared: !note.is_shared } as any);
      toast({
        title: note.is_shared ? 'Link disabled' : 'Sharing enabled!',
        description: note.is_shared 
          ? 'Note is now private' 
          : 'Anyone with the link can view this note',
      });
    }
  };

  const copyShareLink = () => {
    if (note && isFullNote(note)) {
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

  const fullNote = isFullNote(note) ? note : null;

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
          disabled={isPreview || !canEdit}
        />

        {/* View-only indicator for shared notes */}
        {isSharedNote && !canEdit && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
            <Lock className="w-3 h-3" />
            View only
          </div>
        )}

        {/* Preview Toggle */}
        {canEdit && (
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
        )}

        {/* Share with specific people - only for own notes */}
        {fullNote && !isSharedNote && (
          <ShareDialog 
            note={fullNote} 
            trigger={
              <Button variant="ghost" size="icon" className="shrink-0">
                <Users className="w-5 h-5" />
              </Button>
            }
          />
        )}

        {/* Public link sharing - only for own notes */}
        {fullNote && !isSharedNote && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={fullNote.is_shared ? 'soft' : 'ghost'}
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
                    <h4 className="font-semibold">Public link</h4>
                    <p className="text-sm text-muted-foreground">
                      Anyone with the link can view
                    </p>
                  </div>
                  <Switch
                    checked={fullNote.is_shared}
                    onCheckedChange={handleShare}
                  />
                </div>

                {fullNote.is_shared && (
                  <div className="flex gap-2 animate-scale-in">
                    <Input
                      value={`${window.location.origin}/shared/${fullNote.share_id}`}
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
        )}
      </div>

      {/* Markdown Toolbar (only in edit mode and can edit) */}
      {!isPreview && canEdit && (
        <MarkdownToolbar 
          textareaRef={textareaRef} 
          content={content} 
          onContentChange={setContent} 
        />
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isPreview || !canEdit ? (
          <div className="flex-1 overflow-y-auto p-4">
            <MarkdownRenderer content={content} className="animate-fade-in" />
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your thoughts... Use Markdown for formatting!"
            className="flex-1 w-full text-lg leading-relaxed placeholder:text-muted-foreground/50 font-mono p-4 bg-transparent resize-none border-none focus:outline-none focus:ring-0 focus-visible:ring-0"
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
            {!canEdit ? '🔒 View only' : isPreview ? '📖 Preview mode' : '✍️ Edit mode'}
          </span>
        </div>
      </div>
    </div>
  );
};
