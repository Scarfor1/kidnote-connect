import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface NoteShare {
  id: string;
  note_id: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface SharedNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  user_id: string;
  permission: 'view' | 'edit';
  owner_email?: string;
}

export const useNoteShares = () => {
  const [sharedWithMe, setSharedWithMe] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSharedWithMe = async () => {
    if (!user) {
      setSharedWithMe([]);
      setLoading(false);
      return;
    }

    try {
      // Get shares where I'm the recipient
      const { data: shares, error: sharesError } = await supabase
        .from('note_shares')
        .select('note_id, permission')
        .eq('shared_with_user_id', user.id);

      if (sharesError) throw sharesError;

      if (!shares || shares.length === 0) {
        setSharedWithMe([]);
        setLoading(false);
        return;
      }

      // Get the actual notes
      const noteIds = shares.map(s => s.note_id);
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds);

      if (notesError) throw notesError;

      // Combine notes with permissions
      const sharedNotes: SharedNote[] = (notes || []).map(note => {
        const share = shares.find(s => s.note_id === note.id);
        return {
          ...note,
          permission: (share?.permission || 'view') as 'view' | 'edit',
        };
      });

      setSharedWithMe(sharedNotes);
    } catch (error: any) {
      console.error('Error fetching shared notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedWithMe();

    // Set up realtime subscription for note_shares changes
    if (user) {
      const channel = supabase
        .channel('note-shares-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'note_shares',
          },
          () => {
            fetchSharedWithMe();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const getSharesForNote = async (noteId: string): Promise<NoteShare[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('note_shares')
        .select('*')
        .eq('note_id', noteId)
        .eq('owner_id', user.id);

      if (error) throw error;
      return (data || []) as NoteShare[];
    } catch (error: any) {
      console.error('Error fetching shares:', error);
      return [];
    }
  };

  const shareNote = async (noteId: string, email: string, permission: 'view' | 'edit') => {
    if (!user) return false;

    try {
      // Check if user exists with this email
      const { data: existingShare } = await supabase
        .from('note_shares')
        .select('id')
        .eq('note_id', noteId)
        .eq('shared_with_email', email.toLowerCase())
        .single();

      if (existingShare) {
        toast({
          title: "Already shared",
          description: "This note is already shared with this email",
          variant: "destructive",
        });
        return false;
      }

      // Try to find a user with this email (we'll match when they log in)
      const { error } = await supabase
        .from('note_shares')
        .insert({
          note_id: noteId,
          owner_id: user.id,
          shared_with_email: email.toLowerCase(),
          permission,
        });

      if (error) throw error;

      toast({
        title: "Shared!",
        description: `Note shared with ${email}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't share note",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSharePermission = async (shareId: string, permission: 'view' | 'edit') => {
    try {
      const { error } = await supabase
        .from('note_shares')
        .update({ permission })
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Updated!",
        description: `Permission changed to ${permission}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't update permission",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('note_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Removed",
        description: "Share access removed",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't remove share",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    sharedWithMe,
    loading,
    getSharesForNote,
    shareNote,
    updateSharePermission,
    removeShare,
    refetch: fetchSharedWithMe,
  };
};
