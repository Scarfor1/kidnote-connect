import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_shared: boolean;
  share_id: string;
  created_at: string;
  updated_at: string;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotes = async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't load your notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();

    // Set up realtime subscription
    if (user) {
      const channel = supabase
        .channel('notes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const createNote = async (title: string = 'Untitled', content: string = '') => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't create note",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'is_shared'>>) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't save changes",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Done!",
        description: "Note deleted",
      });
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: "Couldn't delete note",
        variant: "destructive",
      });
    }
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
};
