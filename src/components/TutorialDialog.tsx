import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Link2, Share2, Palette, Network, Sparkles } from 'lucide-react';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TUTORIAL_SEEN_KEY = 'noteshub-tutorial-seen';

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to NotesHub! 👋',
    description: 'Your personal knowledge base with powerful linking, sharing, and visualization. Let\'s take a quick tour of what you can do.',
    tips: ['Notes auto-save as you type', 'Rich Markdown formatting built-in', 'Works great on mobile too!'],
  },
  {
    icon: FileText,
    title: 'Create & Edit Notes',
    description: 'Tap the + button to create a new note. Write in Markdown for rich formatting — bold, headers, lists, code blocks, math with LaTeX, and more.',
    tips: ['Use **bold** and *italic* for emphasis', 'Create headers with # and ##', 'Add math with $E=mc^2$ syntax'],
  },
  {
    icon: Link2,
    title: 'Link Your Notes',
    description: 'Connect ideas by linking notes together using double brackets. Just type [[Note Title]] in any note to create a link to another note with that title.',
    tips: ['Type [[Meeting Notes]] to link', 'Links appear in the Graph View', 'Build your own knowledge graph!'],
  },
  {
    icon: Network,
    title: 'Graph View',
    description: 'Visualize how your notes connect! Open Graph View from Settings (⚙️) to see all your notes and their links as a smooth, interactive graph.',
    tips: ['Scroll or pinch to zoom', 'Drag to pan around', 'Tap a node to jump to that note'],
  },
  {
    icon: Share2,
    title: 'Share & Collaborate',
    description: 'Share any note by email with view-only or edit access. You can also create a public link for anyone to read.',
    tips: ['👥 icon shares with specific people', '🔗 icon creates a public link', 'Shared notes appear in their own section'],
  },
  {
    icon: Palette,
    title: 'Make It Yours',
    description: 'Switch between themes in Settings (⚙️). Use templates to speed up note creation, and scan handwritten notes with AI. You\'re all set!',
    tips: ['Multiple color themes to choose from', 'Ctrl+N for quick note from template', 'Ctrl+/ shows all keyboard shortcuts'],
  },
];

export const TutorialDialog = ({ open, onOpenChange }: TutorialDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleClose = () => {
    setCurrentStep(0);
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogHeader className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Step {currentStep + 1} of {steps.length}
              </p>
              <DialogTitle className="text-lg leading-tight">{step.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

          <div className="space-y-2.5 bg-muted/30 rounded-xl p-3.5">
            {step.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-primary mt-0.5 text-xs">✦</span>
                <span className="text-foreground/80">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={isFirst}
            className="gap-1 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <button
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Skip
          </button>

          {isLast ? (
            <Button size="sm" onClick={handleClose} className="gap-1.5 rounded-xl">
              Get Started
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCurrentStep(s => s + 1)} className="gap-1 rounded-xl">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const shouldShowTutorial = (): boolean => {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true';
};
