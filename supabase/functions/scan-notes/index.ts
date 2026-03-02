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
      ? `You are a precise document transcription assistant. Your task is to create an EXACT 1:1 digital copy of the image content.

INSTRUCTIONS:
1. Transcribe ALL text EXACTLY as written - do NOT fix spelling, grammar, or formatting
2. Preserve the EXACT layout, spacing, and structure of the original
3. Keep all text in its original position and order
4. For handwritten text, transcribe exactly what is written, including any mistakes
5. For drawings, diagrams, or sketches, describe them in detail using [Drawing: ...] markers
6. For arrows, lines, or visual connections, describe them as [Arrow: from X to Y] or [Line: ...]
7. For doodles or decorative elements, note them as [Doodle: description]
8. For crossed-out or struck-through text, show it as ~~crossed out text~~
9. For underlined text, use __underlined text__
10. For circled text or elements, note as [Circled: text]
11. For highlighted sections, note as [Highlighted: text]
12. Preserve exact indentation and spacing using spaces
13. Do NOT reorganize, summarize, or interpret the content
14. Do NOT add any formatting that isn't in the original

OUTPUT: Return the exact transcription as-is, preserving the original structure.`
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
        max_tokens: 4096,
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
