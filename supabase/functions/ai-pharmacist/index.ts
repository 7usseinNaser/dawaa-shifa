import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an AI pharmacist assistant for the Dawaa Shifa app (دواء شفاء). You help users with:
- Medicine dosages (adults and children)
- Drug interactions and contraindications
- Medicine alternatives (same active ingredient)
- General pharmaceutical guidance

Rules:
1. Always answer in the SAME language as the user's question (Arabic or English).
2. Be concise, clear, and practical.
3. ALWAYS include a disclaimer that this is general guidance and does not replace consulting a doctor or pharmacist.
4. If asked about a specific medicine, give standard adult dosing and mention pediatric dosing requires a doctor.
5. For interactions, clearly state severity and recommend consulting a doctor.
6. Never recommend self-medicating for serious conditions.
7. If the question is unrelated to medicines/pharmacy, politely redirect to medicine topics.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, lang } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply:
            lang === "ar"
              ? "عذراً، المساعد الذكي غير متاح حالياً. هذه إرشادات عامة: استشر طبيبك أو الصيدلي دائماً قبل تناول أي دواء."
              : "Sorry, the AI assistant is currently unavailable. General guidance: always consult your doctor or pharmacist before taking any medicine.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "bot" ? "assistant" : m.role,
        content: m.content,
      })),
    ];

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: apiMessages,
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Groq API error:", resp.status, errText);
      return new Response(
        JSON.stringify({
          reply:
            lang === "ar"
              ? "عذراً، حدث خطأ مؤقت. حاول مرة أخرى لاحقاً. تذكر: استشر طبيبك أو الصيدلي دائماً."
              : "Sorry, a temporary error occurred. Please try again later. Remember: always consult your doctor or pharmacist.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      (lang === "ar"
        ? "عذراً، لم أتمكن من توليد رد. حاول مرة أخرى."
        : "Sorry, I could not generate a reply. Please try again.");

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        reply:
          "عذراً، حدث خطأ. حاول مرة أخرى لاحقاً. استشر طبيبك أو الصيدلي دائماً.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
