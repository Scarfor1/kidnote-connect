import { useState, useEffect, useCallback, useRef, DragEvent } from 'react';
import { Note } from '@/hooks/useNotes';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Check, Copy, Menu, Sparkles, Eye, Edit3, Users, Lock, Minus, Plus } from 'lucide-react';
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
  onOpenScanner?: () => void;
}

// Type guard to check if note is a full Note
const isFullNote = (note: BaseNote): note is Note => {
  return 'is_shared' in note && 'share_id' in note;
};

const FONT_SIZES = [14, 16, 18, 20, 22, 24];
const DEFAULT_FONT_SIZE = 18;

export const NoteEditor = ({
  note,
  onUpdateNote,
  onToggleSidebar,
  showSidebarToggle,
  isSharedNote = false,
  canEdit = true,
  onOpenScanner,
}: NoteEditorProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('note-editor-font-size');
    return saved ? parseInt(saved, 10) : DEFAULT_FONT_SIZE;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { uploadImage, uploading } = useImageUpload();

  // Save font size preference
  useEffect(() => {
    localStorage.setItem('note-editor-font-size', fontSize.toString());
  }, [fontSize]);

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZES[currentIndex - 1]);
    }
  };

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

  // Apply markdown formatting
  const applyFormatting = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea || isPreview || !canEdit) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    const newContent = `${beforeText}${prefix}${selectedText || 'text'}${suffix}${afterText}`;
    setContent(newContent);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4);
      }
    }, 0);
  }, [content, isPreview, canEdit]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit || isPreview) return;
    setIsDragging(true);
  }, [canEdit, isPreview]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit || isPreview) return;

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      toast({
        title: 'Invalid file',
        description: 'Please drop an image file',
        variant: 'destructive',
      });
      return;
    }

    for (const file of files) {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        const imageMarkdown = `![${file.name}](${imageUrl})\n`;
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart || content.length;
          const newContent = content.slice(0, start) + imageMarkdown + content.slice(start);
          setContent(newContent);
        } else {
          setContent(prev => prev + '\n' + imageMarkdown);
        }
      }
    }
  }, [canEdit, isPreview, uploadImage, content, toast]);

  // Keyboard shortcuts for formatting
  useKeyboardShortcuts([
    {
      key: 'b',
      ctrlKey: true,
      action: () => applyFormatting('**'),
      description: 'Bold',
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => applyFormatting('*'),
      description: 'Italic',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => applyFormatting('[', '](url)'),
      description: 'Link',
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        saveNote();
        toast({ title: 'Saved!', description: 'Note saved successfully' });
      },
      description: 'Save',
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => canEdit && setIsPreview(!isPreview),
      description: 'Toggle preview',
    },
  ]);

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
        <div className="text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-primary/12 mb-5 shadow-lg shadow-primary/15 animate-bounce-gentle">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">
            Ready to write? ✨
          </h2>
          <p className="text-muted-foreground text-lg max-w-sm">
            Select a note from the sidebar or create a new one to get started
          </p>
          <p className="text-muted-foreground/60 text-sm mt-5 max-w-sm">
            💡 Tip: Use Markdown for formatting and [[Note Title]] to link notes
          </p>
        </div>
      </div>
    );
  }

  const fullNote = isFullNote(note) ? note : null;

  return (
    <div 
      className={`h-full flex flex-col bg-background animate-fade-in relative ${isDragging ? 'ring-2 ring-primary ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-primary">Drop image here</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-sidebar-border">
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
          className="flex-1 text-lg sm:text-xl font-bold bg-transparent border-none h-auto p-0 focus-visible:ring-0 placeholder:text-muted-foreground"
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
          onOpenScanner={onOpenScanner}
        />
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isPreview || !canEdit ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ fontSize: `${fontSize}px` }}>
            <MarkdownRenderer content={content} className="animate-fade-in" />
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your thoughts... Use Markdown for formatting!"
            className="flex-1 w-full leading-relaxed placeholder:text-muted-foreground/50 font-mono p-4 sm:p-6 bg-transparent resize-none border-none focus:outline-none focus:ring-0 focus-visible:ring-0 whitespace-pre-wrap break-words overflow-wrap-anywhere"
            style={{ fontSize: `${fontSize}px` }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-sidebar-border text-xs text-muted-foreground flex items-center justify-between">
        <div>
          {uploading ? (
            <span className="text-primary">Uploading image...</span>
          ) : (
            <>
              <span>Last saved {new Date(note.updated_at).toLocaleTimeString()}</span>
              <span className="mx-2">•</span>
              <span>{content.length} characters</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Font size controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={decreaseFontSize}
              disabled={fontSize === FONT_SIZES[0]}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-8 text-center">{fontSize}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={increaseFontSize}
              disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <span className="hidden sm:inline text-muted-foreground/60">
            {!canEdit ? '🔒 View only' : isPreview ? '📖 Preview mode' : '✍️ Edit mode'}
          </span>
        </div>
      </div>
    </div>
  );
};
