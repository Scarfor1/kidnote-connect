import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
          {
            role: "system",
            content: systemPrompt
          },
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

    // Extract a title from the first heading or first line
    let suggestedTitle = "Scanned Notes";
    const lines = transcribedText.split('\n').filter((l: string) => l.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Remove markdown heading syntax for title
      suggestedTitle = firstLine.replace(/^#+\s*/, '').substring(0, 100);
    }

    return new Response(
      JSON.stringify({ 
        content: transcribedText,
        suggestedTitle
      }),
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
