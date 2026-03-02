

## Use Google Cloud Vision API for Better Note Scanning

### Why
Google Cloud Vision API uses the same OCR engine as Google Lens. It's significantly faster and more accurate for text extraction, especially for handwritten notes and equations. The current approach sends the entire image to an LLM for OCR + formatting in one step, which is slower and less reliable for dense pages.

### Approach: Two-Step Pipeline

Instead of relying solely on the AI model for both OCR and formatting, split the work:

1. **Step 1 - Google Cloud Vision API**: Extract raw text from the image (fast, accurate OCR)
2. **Step 2 - Lovable AI (optional)**: Format the extracted text into clean Markdown (only in Smart Mode)

For **Exact Copy Mode**, we can skip Step 2 entirely and just use the Vision API output directly, which preserves the original text as-is.

### Setup Required

Google Cloud Vision API requires an API key:
1. User creates a Google Cloud project (or uses existing one)
2. Enables the "Cloud Vision API"
3. Creates an API key
4. We store it as a secret in Lovable Cloud

### Changes

**1. Add Google Cloud Vision API key as a secret**
- Use the secrets tool to request `GOOGLE_CLOUD_VISION_API_KEY` from the user

**2. Update `supabase/functions/scan-notes/index.ts`**
- Add a new function that calls `https://vision.googleapis.com/v1/images:annotate` with `DOCUMENT_TEXT_DETECTION` (best for dense text and handwriting)
- For **Exact Copy Mode**: Return the Vision API text directly (preserving layout via the API's block/paragraph/word structure)
- For **Smart Mode**: Pass the Vision API extracted text to Lovable AI (`gemini-2.5-flash` -- faster since it only needs to format, not OCR) to clean up into Markdown
- Fall back to the current all-in-one AI approach if the Vision API key is not configured

**3. No frontend changes needed**
- The `NoteScannerDialog` and `useNoteScanner` hook remain the same -- the improvement is entirely in the edge function

### Architecture

```text
Current:  Image --> Gemini Pro (OCR + format) --> Markdown
                    (slow, misses content)

New:      Image --> Vision API (OCR) --> Raw Text
                                            |
                    Exact Copy: return as-is |
                    Smart Mode: --> Gemini Flash (format only) --> Markdown
```

### Benefits
- Much faster (Vision API responds in ~1-2 seconds vs 10-20s for LLM)
- More accurate text extraction, especially for handwriting
- Preserves spatial layout information (blocks, paragraphs, coordinates)
- Cheaper per request
- Gemini Flash is used only for formatting (not OCR), so it's faster and cheaper too

### Cost
- Google Cloud Vision API: first 1,000 units/month free, then $1.50 per 1,000 images
- Very affordable for personal note-scanning use

