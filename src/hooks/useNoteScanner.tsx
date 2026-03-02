import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScanResult {
  content: string;
  suggestedTitle: string;
}

export const useNoteScanner = () => {
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const scanImage = useCallback(async (file: File, exactCopy: boolean = false): Promise<ScanResult | null> => {
    setScanning(true);
    
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-notes', {
        body: { imageBase64: base64, exactCopy }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Notes scanned!",
        description: "Your notes have been converted to text",
      });

      return {
        content: data.content,
        suggestedTitle: data.suggestedTitle
      };

    } catch (error) {
      console.error('Scan error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan notes';
      
      toast({
        title: "Scan failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setScanning(false);
    }
  }, [toast]);

  const scanFromUrl = useCallback(async (imageUrl: string): Promise<ScanResult | null> => {
    setScanning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('scan-notes', {
        body: { imageUrl }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Notes scanned!",
        description: "Your notes have been converted to text",
      });

      return {
        content: data.content,
        suggestedTitle: data.suggestedTitle
      };

    } catch (error) {
      console.error('Scan error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan notes';
      
      toast({
        title: "Scan failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setScanning(false);
    }
  }, [toast]);

  return {
    scanning,
    scanImage,
    scanFromUrl
  };
};
