import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function extractTextWithVisionAPI(imageBase64: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        }],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vision API error:", response.status, errorText);
    throw new Error(`Vision API error: ${response.status}`);
  }

  const data = await response.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  
  if (!annotation) {
    throw new Error("No text detected in image");
  }

  return annotation.text || "";
}

async function extractTextFromUrlWithVisionAPI(imageUrl: string, apiKey: string): Promise<string> {
  // Download image and convert to base64
  const imgResponse = await fetch(imageUrl);
  const arrayBuffer = await imgResponse.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  return extractTextWithVisionAPI(base64, apiKey);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, exactCopy } = await req.json();
    
    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing image data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_VISION_KEY = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // If Vision API key is available, use the two-step pipeline
    if (GOOGLE_VISION_KEY) {
      console.log("Using Google Cloud Vision API pipeline");
      
      // Step 1: Extract text with Vision API
      let rawText: string;
      try {
        rawText = imageBase64
          ? await extractTextWithVisionAPI(imageBase64, GOOGLE_VISION_KEY)
          : await extractTextFromUrlWithVisionAPI(imageUrl, GOOGLE_VISION_KEY);
      } catch (visionError) {
        console.error("Vision API failed, falling back to AI-only:", visionError);
        // Fall through to AI-only approach below
        return await handleWithAIOnly(imageBase64, imageUrl, exactCopy, LOVABLE_API_KEY, corsHeaders);
      }

      // Step 2: For exact copy, return raw text directly. For smart mode, format with AI.
      if (exactCopy) {
        const suggestedTitle = extractTitle(rawText);
        return new Response(
          JSON.stringify({ content: rawText, suggestedTitle }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Smart mode: format with Gemini Flash (fast, since it only formats)
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const formatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a note formatting assistant. You receive raw OCR text extracted from an image of notes. Your job is to format it into clean, well-structured Markdown.

INSTRUCTIONS:
1. Organize the text into logical sections with appropriate Markdown headings (# ## ###)
2. Use bullet points (-) or numbered lists (1. 2. 3.) as appropriate
3. Use **bold** for emphasized text and *italic* for secondary emphasis
4. Use \`code\` formatting for technical terms or code
5. Create tables using Markdown table syntax if tabular data is present
6. Use > for quoted text or callouts
7. Fix obvious OCR artifacts and spelling errors if clear from context
8. For mathematical content, use LaTeX notation: $...$ for inline and $$...$$ for display equations
9. Maintain the original organization and meaning
10. Never add content that wasn't in the original text

OUTPUT: Return ONLY the formatted Markdown text.`
            },
            {
              role: "user",
              content: `Please format this raw OCR text into clean Markdown:\n\n${rawText}`
            }
          ],
          max_tokens: 8192,
        }),
      });

      if (!formatResponse.ok) {
        // If formatting fails, return raw text
        console.error("Format AI failed, returning raw text");
        const suggestedTitle = extractTitle(rawText);
        return new Response(
          JSON.stringify({ content: rawText, suggestedTitle }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formatData = await formatResponse.json();
      const formattedText = formatData.choices?.[0]?.message?.content || rawText;
      const suggestedTitle = extractTitle(formattedText);

      return new Response(
        JSON.stringify({ content: formattedText, suggestedTitle }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No Vision API key — fall back to AI-only approach
    return await handleWithAIOnly(imageBase64, imageUrl, exactCopy, LOVABLE_API_KEY, corsHeaders);

  } catch (error) {
    console.error("scan-notes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractTitle(text: string): string {
  const lines = text.split('\n').filter((l: string) => l.trim());
  if (lines.length > 0) {
    return lines[0].trim().replace(/^#+\s*/, '').substring(0, 100);
  }
  return "Scanned Notes";
}

async function handleWithAIOnly(
  imageBase64: string | undefined,
  imageUrl: string | undefined,
  exactCopy: boolean,
  LOVABLE_API_KEY: string | undefined,
  corsHeaders: Record<string, string>
) {
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const imageContent = imageUrl
    ? { type: "image_url", image_url: { url: imageUrl } }
    : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } };

  const systemPrompt = exactCopy
    ? `You are an exhaustive document transcription engine. Your ONLY job is to produce a COMPLETE 1:1 digital copy of EVERY piece of content on the page. Missing even a single line, equation, or symbol is a failure.

CRITICAL RULES:
- Transcribe EVERY SINGLE piece of text, equation, symbol, annotation, label, number, and mark on the page. Do NOT skip ANYTHING.
- Work systematically: scan from TOP to BOTTOM, LEFT to RIGHT. Go region by region, line by line.
- If content is unclear or hard to read, still include it using [unclear: best guess] markers. NEVER skip unclear content.
- Do NOT fix spelling, grammar, or formatting. Reproduce exactly as written, including mistakes.
- Do NOT add any content that is not in the original image.
- Do NOT reproduce the background, paper texture, or ruled lines — only the written/printed content.

MATHEMATICAL CONTENT (CRITICAL):
- Transcribe EVERY equation, formula, and mathematical expression using LaTeX notation.
- Use $...$ for inline math and $$...$$ for display/block equations.
- Watch for and correctly transcribe ALL of these:
  * Fractions: $\\frac{a}{b}$
  * Integrals: $\\int_{a}^{b} f(x) dx$
  * Summations: $\\sum_{i=1}^{n}$
  * Products: $\\prod_{i=1}^{n}$
  * Limits: $\\lim_{x \\to 0}$
  * Derivatives: $\\frac{d}{dx}$, $f'(x)$, $\\partial$
  * Subscripts and superscripts: $x_i$, $x^2$, $x_{i,j}^{2n+1}$
  * Greek letters: $\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\theta, \\lambda, \\mu, \\pi, \\sigma, \\phi, \\omega$ etc.
  * Operators: $\\times, \\div, \\pm, \\mp, \\cdot, \\leq, \\geq, \\neq, \\approx, \\equiv, \\propto$
  * Vectors/matrices: $\\vec{v}$, $\\hat{x}$, $\\mathbf{A}$, use \\begin{pmatrix}...\\end{pmatrix} for matrices
  * Set notation: $\\in, \\notin, \\subset, \\cup, \\cap, \\emptyset$
  * Roots: $\\sqrt{x}$, $\\sqrt[n]{x}$
  * Arrows: $\\rightarrow, \\leftarrow, \\Rightarrow, \\Leftrightarrow$
- If equations are numbered in the original (e.g., (1), (2)), preserve those numbers.

LAYOUT & STRUCTURE:
- Use blank lines to separate distinct regions or groups of content.
- Use indentation (spaces) to approximate horizontal positioning.
- For multi-column content, transcribe left column first, then right column, clearly separated.
- For tables, use Markdown table syntax.

NON-TEXT ELEMENTS:
- Drawings/diagrams: [Drawing: detailed description of what is drawn]
- Arrows/lines: [Arrow: from X to Y] or [Line: description]
- Graphs/plots: [Graph: description of axes, curves, and key points]
- Circled items: [Circled: content]
- Crossed-out text: ~~crossed out text~~
- Underlined text: __underlined text__
- Boxed equations: [Boxed: equation]
- Stars, checkmarks, bullets: reproduce with ★, ✓, •

OUTPUT: Return the COMPLETE transcription. Every line, every equation, every symbol. Nothing omitted.`
    : `You are an expert note transcription assistant. Your task is to convert images of handwritten or printed notes into clean, well-formatted Markdown text.

INSTRUCTIONS:
1. Transcribe ALL text from the image accurately, preserving the original meaning
2. Recognize and transcribe both printed and handwritten text
3. Preserve the structure and formatting:
   - Use appropriate Markdown headings (# ## ###) for titles and sections
   - Use bullet points (-) or numbered lists (1. 2. 3.) as appropriate
   - Use **bold** for emphasized or underlined text
   - Use *italic* for secondary emphasis
   - Use \`code\` formatting for technical terms or code
   - Create tables using Markdown table syntax if tables are present
   - Use > for quoted text or callouts
   - Use --- for horizontal dividers if present
4. Handle diagrams and drawings:
   - Describe diagrams briefly in [brackets], e.g., [Diagram: flowchart showing process A → B → C]
   - If there are arrows or flowcharts, describe the flow clearly
5. Handle mathematical content:
   - Write simple math inline, e.g., x = 5 + 3
   - For complex equations, describe them clearly
6. Quality standards:
   - Fix obvious spelling errors if clear from context
   - Maintain the original organization and layout logic
   - If text is unclear, use [unclear] marker
   - Never add content that isn't in the image

OUTPUT: Return ONLY the transcribed Markdown text, nothing else.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: exactCopy
              ? "Create an exact 1:1 digital copy of this page, preserving everything exactly as-is:"
              : "Please transcribe this image of notes into clean Markdown format:" },
            imageContent
          ]
        }
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    return new Response(
      JSON.stringify({ error: "Failed to process image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await response.json();
  const transcribedText = data.choices?.[0]?.message?.content || "";
  const suggestedTitle = extractTitle(transcribedText);

  return new Response(
    JSON.stringify({ content: transcribedText, suggestedTitle }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
