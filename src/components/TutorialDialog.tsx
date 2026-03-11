import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Link2, Share2, Palette, Network, Camera, Sparkles } from 'lucide-react';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: FileText,
    title: 'Create & Edit Notes',
    description: 'Tap the + button to create a new note. Write in Markdown for rich formatting — bold, headers, lists, code blocks, and more. Your notes save automatically as you type.',
    tips: ['Use **bold** and *italic* for emphasis', 'Create headers with # and ##', 'Add code with ```language blocks'],
  },
  {
    icon: Link2,
    title: 'Link Your Notes',
    description: 'Connect ideas by linking notes together using double brackets. Just type [[Note Title]] in any note to create a link to another note with that title.',
    tips: ['Type [[Meeting Notes]] to link', 'Links appear in the Graph View', 'Great for building a knowledge base'],
  },
  {
    icon: Network,
    title: 'Graph View',
    description: 'Visualize how your notes connect! Open Graph View from Settings to see all your notes and their links as an interactive graph. Zoom, pan, and click nodes to navigate.',
    tips: ['Pinch to zoom on mobile', 'Drag to pan around', 'Click a node to open that note'],
  },
  {
    icon: Sparkles,
    title: 'Templates & Scanner',
    description: 'Speed up note creation with templates — choose from built-in ones or create your own. Use the Note Scanner to extract text from images using AI.',
    tips: ['Ctrl+N opens template picker', 'Create custom templates for repeated formats', 'Scanner works with handwritten notes too'],
  },
  {
    icon: Share2,
    title: 'Share & Collaborate',
    description: 'Share any note with others by email. You can grant view-only or edit access. Shared notes sync in real-time so everyone stays updated.',
    tips: ['Click the share icon on any note', 'Choose view or edit permissions', 'Shared notes appear in a separate section'],
  },
  {
    icon: Palette,
    title: 'Themes & Shortcuts',
    description: 'Make NotesHub yours! Switch between multiple themes in Settings. Use keyboard shortcuts to work faster — press Ctrl+/ to see all available shortcuts.',
    tips: ['Multiple themes available in Settings', 'Ctrl+N for new note', 'Ctrl+/ shows all shortcuts'],
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 px-4 pt-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogHeader className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
              <DialogTitle className="text-lg">{step.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

          <div className="space-y-2">
            {step.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span className="text-foreground">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={isFirst}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <button
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tutorial
          </button>

          {isLast ? (
            <Button size="sm" onClick={handleClose} className="gap-1">
              Get Started
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCurrentStep(s => s + 1)} className="gap-1">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
