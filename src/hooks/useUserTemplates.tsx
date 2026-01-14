import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface UserTemplate {
  id: string;
  user_id: string;
  name: string;
  title: string;
  content: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export const useUserTemplates = () => {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (
    name: string,
    title: string,
    content: string,
    isShared: boolean = false
  ): Promise<UserTemplate | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_templates')
        .insert({
          user_id: user.id,
          name,
          title,
          content,
          is_shared: isShared,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates((prev) => [data, ...prev]);
      toast({
        title: 'Template saved!',
        description: isShared ? 'Others can now use this template' : 'Template saved to your library',
      });
      return data;
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<Pick<UserTemplate, 'name' | 'title' | 'content' | 'is_shared'>>
  ) => {
    try {
      const { error } = await supabase
        .from('user_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    const previousTemplates = templates;
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error } = await supabase
        .from('user_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template deleted',
        description: 'Template removed from your library',
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      setTemplates(previousTemplates);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const toggleShare = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    await updateTemplate(id, { is_shared: !template.is_shared });
    toast({
      title: template.is_shared ? 'Template is now private' : 'Template shared!',
      description: template.is_shared
        ? 'Only you can see this template'
        : 'Others can now use this template',
    });
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleShare,
    refetch: fetchTemplates,
  };
};
