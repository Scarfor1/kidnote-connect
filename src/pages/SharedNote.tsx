import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface SharedNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

const SharedNote = () => {
  const { shareId } = useParams();
  const [note, setNote] = useState<SharedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      if (!shareId) return;

      try {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, updated_at')
          .eq('share_id', shareId)
          .eq('is_shared', true)
          .single();

        if (error || !data) {
          setError(true);
        } else {
          setNote(data);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
            <FileText className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Note not found</h1>
          <p className="text-muted-foreground mb-6">
            This note doesn't exist or is no longer shared
          </p>
          <Button asChild variant="soft">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Go to NotesHub
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">
              Notes<span className="text-primary">Hub</span>
            </span>
          </Link>
          <Button asChild variant="soft" size="sm">
            <Link to="/">
              Create your own notes
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 animate-slide-up">
        <article>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {note.title || 'Untitled'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(note.updated_at), 'MMMM d, yyyy')}
            </span>
          </div>
          <div className="prose prose-invert max-w-none">
            <p className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {note.content || 'This note is empty.'}
            </p>
          </div>
        </article>
      </main>
    </div>
  );
};

export default SharedNote;
