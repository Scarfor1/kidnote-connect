import { useState, useEffect } from 'react';
import { Note } from '@/hooks/useNotes';
import { NoteShare, useNoteShares } from '@/hooks/useNoteShares';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, UserPlus, Trash2, Eye, Edit3 } from 'lucide-react';

interface ShareDialogProps {
  note: Note;
  trigger?: React.ReactNode;
}

export const ShareDialog = ({ note, trigger }: ShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { getSharesForNote, shareNote, updateSharePermission, removeShare } = useNoteShares();

  const loadShares = async () => {
    setLoading(true);
    const data = await getSharesForNote(note.id);
    setShares(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open, note.id]);

  const handleShare = async () => {
    if (!email.trim()) return;
    
    const success = await shareNote(note.id, email.trim(), permission);
    if (success) {
      setEmail('');
      loadShares();
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: 'view' | 'edit') => {
    await updateSharePermission(shareId, newPermission);
    loadShares();
  };

  const handleRemove = async (shareId: string) => {
    await removeShare(shareId);
    loadShares();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Users className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share with people
          </DialogTitle>
          <DialogDescription>
            Invite people to view or collaborate on "{note.title || 'Untitled'}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new share */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleShare();
              }}
            />
            <Select value={permission} onValueChange={(v: 'view' | 'edit') => setPermission(v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <span className="flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    View
                  </span>
                </SelectItem>
                <SelectItem value="edit">
                  <span className="flex items-center gap-2">
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleShare} size="icon">
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          {/* Existing shares */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not shared with anyone yet
              </p>
            ) : (
              shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {share.shared_with_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {share.shared_with_user_id ? 'Active' : 'Pending invite'}
                    </p>
                  </div>
                  <Select
                    value={share.permission}
                    onValueChange={(v: 'view' | 'edit') => handleUpdatePermission(share.id, v)}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(share.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
