import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckSquare, Calendar, Lightbulb, Users, Target, BookOpen, Briefcase, 
  Plus, Trash2, Globe, Lock 
} from 'lucide-react';
import { useUserTemplates, UserTemplate } from '@/hooks/useUserTemplates';
import { CreateTemplateDialog } from './CreateTemplateDialog';

export interface NoteTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  title: string;
  content: string;
}

export const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting',
    name: 'Meeting Notes',
    icon: <Users className="w-5 h-5" />,
    title: 'Meeting Notes - {{date}}',
    content: `## Meeting Notes

**Date:** {{date}}
**Attendees:** 

---

### Agenda
1. 
2. 
3. 

### Discussion Points


### Action Items
- [ ] 
- [ ] 

### Next Steps

`,
  },
  {
    id: 'todo',
    name: 'Todo List',
    icon: <CheckSquare className="w-5 h-5" />,
    title: 'Tasks - {{date}}',
    content: `## Today's Tasks

### High Priority
- [ ] 

### Medium Priority
- [ ] 

### Low Priority
- [ ] 

---

### Completed ✅

`,
  },
  {
    id: 'journal',
    name: 'Daily Journal',
    icon: <Calendar className="w-5 h-5" />,
    title: 'Journal - {{date}}',
    content: `## {{date}}

### How am I feeling today?


### What am I grateful for?
1. 
2. 
3. 

### Today's wins


### What could be better?


### Tomorrow's focus

`,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: <Lightbulb className="w-5 h-5" />,
    title: 'Brainstorm: ',
    content: `## Brainstorm Session

### Topic


### Ideas
- 
- 
- 

### Pros & Cons

| Idea | Pros | Cons |
|------|------|------|
|      |      |      |

### Next Actions

`,
  },
  {
    id: 'project',
    name: 'Project Plan',
    icon: <Target className="w-5 h-5" />,
    title: 'Project: ',
    content: `## Project Overview

### Goal


### Timeline
- **Start:** 
- **End:** 

### Milestones
1. [ ] 
2. [ ] 
3. [ ] 

### Resources Needed


### Risks & Mitigation


### Success Criteria

`,
  },
  {
    id: 'notes',
    name: 'Study Notes',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Notes: ',
    content: `## Study Notes

### Topic


### Key Concepts
- 

### Summary


### Questions
- 

### Related Links
- [[]]

`,
  },
  {
    id: 'weekly',
    name: 'Weekly Review',
    icon: <Briefcase className="w-5 h-5" />,
    title: 'Week of {{date}}',
    content: `## Weekly Review

### Accomplishments
- 

### Challenges


### Lessons Learned


### Goals for Next Week
1. 
2. 
3. 

### Notes

`,
  },
];

interface NoteTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  trigger?: React.ReactNode;
}

export const NoteTemplates = ({
  open,
  onOpenChange,
  onSelectTemplate,
  trigger,
}: NoteTemplatesProps) => {
  const { templates: userTemplates, createTemplate, deleteTemplate, loading } = useUserTemplates();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSelect = (template: NoteTemplate | UserTemplate) => {
    const date = formatDate();
    const formattedTemplate = {
      id: template.id,
      name: template.name,
      icon: null,
      title: template.title.replace(/\{\{date\}\}/g, date),
      content: template.content.replace(/\{\{date\}\}/g, date),
    };
    onSelectTemplate(formattedTemplate);
    onOpenChange(false);
  };

  const handleCreateTemplate = async (
    name: string,
    title: string,
    content: string,
    isShared: boolean
  ) => {
    await createTemplate(name, title, content, isShared);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteTemplate(id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {/* User Templates Section */}
              {userTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Your Templates
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {userTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className="relative flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm text-center">
                          {template.name}
                        </span>
                        <div className="absolute top-2 right-2 flex gap-1">
                          {template.is_shared ? (
                            <Globe className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          )}
                          <button
                            onClick={(e) => handleDeleteTemplate(e, template.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Templates Section */}
              <div>
                {userTemplates.length > 0 && (
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Built-in Templates
                  </h3>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {DEFAULT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelect(template)}
                      className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        {template.icon}
                      </div>
                      <span className="font-medium text-sm text-center">
                        {template.name}
                      </span>
                    </button>
                  ))}

                  {/* Create Template Button */}
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex flex-col items-center gap-3 p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm text-center">
                      Create Template
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">T</kbd> to open templates
          </p>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreateTemplate}
      />
    </>
  );
};
