import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, title: string, content: string, isShared: boolean) => Promise<void>;
  initialTitle?: string;
  initialContent?: string;
}

export const CreateTemplateDialog = ({
  open,
  onOpenChange,
  onSave,
  initialTitle = '',
  initialContent = '',
}: CreateTemplateDialogProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), title.trim() || 'Untitled', content, isShared);
    setSaving(false);
    onOpenChange(false);
    // Reset form
    setName('');
    setTitle('');
    setContent('');
    setIsShared(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Report"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-title">Default Note Title</Label>
            <Input
              id="template-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Week of {{date}}"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{date}}"} to insert the current date
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-content">Content</Label>
            <Textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="## Your template content here..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="template-shared">Share with others</Label>
              <p className="text-xs text-muted-foreground">
                Allow others to use this template
              </p>
            </div>
            <Switch
              id="template-shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
