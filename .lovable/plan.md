

## Improving the Exact Copy Mode for Note Scanning

### Problem
The current "exact copy" prompt is too vague and misses most content. It tells the AI to "transcribe ALL text" but doesn't emphasize capturing every single equation, formula, symbol, and piece of content on the page. The AI is only picking up ~4 equations instead of everything.

### Solution
Rewrite the exact copy system prompt in the `scan-notes` edge function to be much more aggressive and specific about capturing ALL content, with special emphasis on:

1. **Mathematical equations and formulas** -- explicit instructions to transcribe every equation using LaTeX-style notation
2. **Every single line** -- stress that nothing should be skipped, even if it seems repetitive or unclear
3. **Spatial layout** -- use monospace/whitespace to approximate positioning
4. **Symbols and special characters** -- arrows, Greek letters, operators, subscripts, superscripts
5. **No background reproduction** -- clarify we want the content only, not the paper/background

### Changes

**File: `supabase/functions/scan-notes/index.ts`**

Replace the exact copy system prompt (lines 33-51) with a significantly improved version that:

- Demands the AI transcribe EVERY piece of text, equation, symbol, drawing, and annotation -- missing nothing
- Uses LaTeX notation (`$...$`) for all math so equations render properly
- Explicitly lists math elements to watch for: fractions, integrals, summations, subscripts, superscripts, Greek letters, matrices
- Instructs line-by-line transcription from top to bottom, left to right
- Uses blank lines and indentation to approximate spatial layout
- Tells the AI to number equations if they're numbered in the original
- Increases `max_tokens` from 4096 to 8192 to handle dense pages with many equations

Also redeploy the edge function after the change.

### Technical Details

The key improvement is switching from a generic "transcribe exactly" instruction to a structured, math-aware prompt that:
- Lists specific math constructs the AI should look for
- Uses `$inline$` and `$$block$$` LaTeX delimiters
- Tells the model to go region by region so nothing is skipped
- Explicitly says "do NOT skip any content, even if unclear -- use [unclear] markers instead"

