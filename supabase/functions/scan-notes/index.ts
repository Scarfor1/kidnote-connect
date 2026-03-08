import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXACT_COPY_PROMPT = `You are an exhaustive document transcription engine. Your ONLY job is to produce a COMPLETE 1:1 digital copy of EVERY piece of content on the page. Missing even a single line, equation, or symbol is a CRITICAL failure.

SCANNING PROCEDURE — follow this exactly:
1. Divide the page into a grid (top-left, top-center, top-right, middle-left, middle-center, middle-right, bottom-left, bottom-center, bottom-right).
2. Scan EACH grid cell systematically. For every cell, transcribe ALL content before moving to the next.
3. After completing the grid scan, do a SECOND PASS over the entire image to catch anything missed.

CRITICAL RULES:
- Transcribe EVERY SINGLE piece of text, equation, symbol, annotation, label, number, and mark on the page. Do NOT skip ANYTHING.
- If content is unclear or hard to read, still include it using [unclear: best guess] markers. NEVER skip unclear content.
- Do NOT fix spelling, grammar, or formatting. Reproduce exactly as written, including mistakes.
- Do NOT add any content that is not in the original image.

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

SELF-CHECK: Before returning your answer, verify:
- Did you scan ALL 9 grid regions?
- Is every line of text accounted for?
- Are all equations transcribed?
- Are all annotations, margin notes, and labels included?

OUTPUT: Return the COMPLETE transcription. Every line, every equation, every symbol. Nothing omitted.`;

const SMART_MODE_PROMPT = `You are an expert note transcription assistant with exceptional attention to detail. Your task is to convert images of handwritten or printed notes into clean, well-formatted Markdown text.

SCANNING PROCEDURE — follow this exactly:
1. First, survey the ENTIRE image to understand the layout and structure.
2. Divide the page into regions (top, middle, bottom; left, center, right).
3. Systematically transcribe EACH region, ensuring nothing is missed.
4. Do a final review pass to catch any overlooked content.

TRANSCRIPTION RULES:
1. Transcribe ALL text from the image accurately — every word, number, symbol, and annotation
2. Recognize and transcribe both printed and handwritten text
3. Include margin notes, annotations, footnotes, headers, page numbers — EVERYTHING
4. If text is unclear, use [unclear: best guess] — never skip it

FORMATTING:
- Use appropriate Markdown headings (# ## ###) for titles and sections
- Use bullet points (-) or numbered lists (1. 2. 3.) as appropriate
- Use **bold** for emphasized or underlined text
- Use *italic* for secondary emphasis
- Use \`code\` formatting for technical terms or code
- Create tables using Markdown table syntax if tables are present
- Use > for quoted text or callouts
- Use --- for horizontal dividers if present

MATHEMATICAL CONTENT:
- Use LaTeX notation: $...$ for inline math, $$...$$ for display equations
- Transcribe ALL equations completely and accurately
- Include equation numbers if present

DIAGRAMS AND DRAWINGS:
- Describe diagrams in [brackets], e.g., [Diagram: flowchart showing process A → B → C]
- Describe graphs with axes, labels, and key data points
- Note arrows, connections, and relationships between elements

QUALITY STANDARDS:
- Fix obvious OCR/spelling errors only if the correction is unambiguous
- Maintain the original organization and layout logic
- Never add content that isn't in the image
- Preserve the logical flow and grouping of information

SELF-CHECK: Before returning, verify you have captured content from ALL areas of the image.

OUTPUT: Return ONLY the transcribed and formatted Markdown text, nothing else.`;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const imageContent = imageUrl
      ? { type: "image_url", image_url: { url: imageUrl } }
      : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } };

    const systemPrompt = exactCopy ? EXACT_COPY_PROMPT : SMART_MODE_PROMPT;

    const userPrompt = exactCopy
      ? "Create an exact 1:1 digital copy of this page. Scan every region systematically — top to bottom, left to right. Do NOT miss a single line, equation, or annotation:"
      : "Transcribe this image of notes into clean Markdown. Scan the ENTIRE image systematically — every region, every line, every annotation. Nothing should be missed:";

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
              { type: "text", text: userPrompt },
              imageContent
            ]
          }
        ],
        max_tokens: 16384,
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
