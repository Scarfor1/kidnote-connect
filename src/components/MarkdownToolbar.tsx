import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Heading1, 
  Heading2, 
  Heading3,
  Link,
  CheckSquare,
  Image,
  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useImageUpload } from '@/hooks/useImageUpload';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (content: string) => void;
}

interface FormatAction {
  icon: React.ElementType;
  label: string;
  prefix: string;
  suffix: string;
  placeholder: string;
  isBlock?: boolean;
}

const formatActions: FormatAction[] = [
  { icon: Bold, label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { icon: Italic, label: 'Italic', prefix: '_', suffix: '_', placeholder: 'italic text' },
  { icon: Strikethrough, label: 'Strikethrough', prefix: '~~', suffix: '~~', placeholder: 'strikethrough' },
  { icon: Code, label: 'Code', prefix: '`', suffix: '`', placeholder: 'code' },
  { icon: Heading1, label: 'Heading 1', prefix: '# ', suffix: '', placeholder: 'Heading 1', isBlock: true },
  { icon: Heading2, label: 'Heading 2', prefix: '## ', suffix: '', placeholder: 'Heading 2', isBlock: true },
  { icon: Heading3, label: 'Heading 3', prefix: '### ', suffix: '', placeholder: 'Heading 3', isBlock: true },
  { icon: Quote, label: 'Quote', prefix: '> ', suffix: '', placeholder: 'quote', isBlock: true },
  { icon: List, label: 'Bullet List', prefix: '- ', suffix: '', placeholder: 'list item', isBlock: true },
  { icon: ListOrdered, label: 'Numbered List', prefix: '1. ', suffix: '', placeholder: 'list item', isBlock: true },
  { icon: CheckSquare, label: 'Task', prefix: '- [ ] ', suffix: '', placeholder: 'task', isBlock: true },
  { icon: Link, label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
];

export const MarkdownToolbar = ({ textareaRef, content, onContentChange }: MarkdownToolbarProps) => {
  const { uploadImage, uploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const before = content.substring(0, start);
      const after = content.substring(start);
      const imageMarkdown = `![image](${url})`;
      
      onContentChange(before + imageMarkdown + after);
      
      setTimeout(() => {
        textarea.focus();
        const newPos = start + imageMarkdown.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applyFormat = useCallback((action: FormatAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newText: string;
    let newStart: number;
    let newEnd: number;

    if (action.isBlock) {
      // For block elements, add at the start of the line
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const beforeLine = content.substring(0, lineStart);
      const afterStart = content.substring(lineStart);
      
      const textToInsert = selectedText || action.placeholder;
      newText = beforeLine + action.prefix + (selectedText ? afterStart : textToInsert + afterStart.substring(start - lineStart));
      
      if (selectedText) {
        newStart = lineStart + action.prefix.length;
        newEnd = newStart + selectedText.length;
      } else {
        newStart = lineStart + action.prefix.length;
        newEnd = newStart + action.placeholder.length;
      }
    } else {
      // For inline elements
      const textToInsert = selectedText || action.placeholder;
      const before = content.substring(0, start);
      const after = content.substring(end);
      
      newText = before + action.prefix + textToInsert + action.suffix + after;
      newStart = start + action.prefix.length;
      newEnd = newStart + textToInsert.length;
    }

    onContentChange(newText);

    // Use setTimeout to ensure the state has updated
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [content, onContentChange, textareaRef]);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-sidebar-border overflow-x-auto">
      {formatActions.map((action, index) => {
        const Icon = action.icon;
        const showDivider = index === 3 || index === 7 || index === 10;
        
        return (
          <div key={action.label} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => applyFormat(action)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                >
                  <Icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {action.label}
              </TooltipContent>
            </Tooltip>
            {showDivider && (
              <div className="w-px h-5 bg-border mx-1" />
            )}
          </div>
        );
      })}
      
      {/* Image upload button */}
      <div className="w-px h-5 bg-border mx-1" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Image className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Upload Image
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
