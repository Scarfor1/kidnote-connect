import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Camera, Upload, Loader2, Check, Edit3, RotateCcw, X } from 'lucide-react';
import { useNoteScanner } from '@/hooks/useNoteScanner';

interface NoteScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNote: (title: string, content: string) => void;
}

type ScanStep = 'capture' | 'processing' | 'review';

export const NoteScannerDialog = ({ open, onOpenChange, onCreateNote }: NoteScannerDialogProps) => {
  const [step, setStep] = useState<ScanStep>('capture');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scannedTitle, setScannedTitle] = useState('');
  const [scannedContent, setScannedContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { scanning, scanImage } = useNoteScanner();

  const resetState = useCallback(() => {
    setStep('capture');
    setPreviewUrl(null);
    setScannedTitle('');
    setScannedContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const processFile = useCallback(async (file: File) => {
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep('processing');

    // Scan the image
    const result = await scanImage(file);
    
    if (result) {
      setScannedTitle(result.suggestedTitle);
      setScannedContent(result.content);
      setStep('review');
    } else {
      // Reset on failure
      setStep('capture');
      setPreviewUrl(null);
    }
  }, [scanImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleSaveNote = useCallback(() => {
    onCreateNote(scannedTitle, scannedContent);
    handleClose();
  }, [scannedTitle, scannedContent, onCreateNote, handleClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Notes
          </DialogTitle>
          <DialogDescription>
            {step === 'capture' && 'Take a photo or upload an image of your notes'}
            {step === 'processing' && 'AI is transcribing your notes...'}
            {step === 'review' && 'Review and edit the transcribed text'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Capture Step */}
          {step === 'capture' && (
            <div className="space-y-4 py-4">
              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Capture options */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3 text-base"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-8 h-8" />
                  <span>Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3 text-base"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8" />
                  <span>Upload Image</span>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Works with handwritten notes, printed text, or mixed content
              </p>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="py-8 space-y-6">
              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={previewUrl} 
                    alt="Captured notes" 
                    className="w-full max-h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm font-medium">Transcribing notes...</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-4 py-4">
              {/* Preview thumbnail */}
              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border border-border h-24">
                  <img 
                    src={previewUrl} 
                    alt="Scanned notes" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetState}
                      className="gap-1 text-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rescan
                    </Button>
                  </div>
                </div>
              )}

              {/* Title input */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input
                  value={scannedTitle}
                  onChange={(e) => setScannedTitle(e.target.value)}
                  placeholder="Note title..."
                />
              </div>

              {/* Content textarea */}
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  Content (editable)
                </label>
                <Textarea
                  value={scannedContent}
                  onChange={(e) => setScannedContent(e.target.value)}
                  placeholder="Scanned content..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === 'review' && (
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveNote} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Create Note
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
