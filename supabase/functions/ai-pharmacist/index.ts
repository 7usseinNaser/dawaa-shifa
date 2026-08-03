import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const MAX_INPUT_CHARS = 2000;
const MAX_MESSAGES = 20;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "غير مصرح: يرجى تسجيل الدخول أولاً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "غير مصرح: التوكن غير صالح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = Date.now();
    const rl = rateLimitMap.get(user.id);
    if (rl) {
      if (now < rl.resetAt) {
        if (rl.count >= RATE_LIMIT_MAX) {
          return new Response(
            JSON.stringify({ error: "طلبات كثيرة. انتظر قليلاً ثم أعد المحاولة." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        rl.count++;
      } else {
        rateLimitMap.set(user.id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimitMap.set(user.id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const body = await req.json();
    const { messages, lang } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Too many messages in a single request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const m of messages) {
      if (!m || typeof m.role !== "string" || typeof m.content !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid message format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (m.content.length > MAX_INPUT_CHARS) {
        return new Response(
          JSON.stringify({ error: "Message too long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
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

    // Map chat messages to Gemini's contents format (roles: "user" / "model")
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "bot" || m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const requestBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 600,
      },
    };

    // Candidate endpoints ordered by preference.
    // v1 is the stable channel; v1beta is the preview channel.
    // We distinguish 429 (quota) from other errors and surface it immediately.
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    ];

    let geminiData: Record<string, unknown> | null = null;

    for (const endpoint of endpoints) {
      const geminiResp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (geminiResp.ok) {
        geminiData = await geminiResp.json() as Record<string, unknown>;
        break;
      }

      const errText = await geminiResp.text();
      console.error(`Gemini error [${geminiResp.status}] ${endpoint.split("/models/")[1]?.split(":")[0]}: ${errText.slice(0, 200)}`);

      if (geminiResp.status === 429) {
        // Quota exceeded — stop immediately and tell the user clearly
        return new Response(
          JSON.stringify({
            reply:
              lang === "ar"
                ? "⏳ المساعد الذكي مزدحم حالياً بسبب كثرة الطلبات. يرجى الانتظار دقيقة واحدة ثم إعادة المحاولة."
                : "⏳ The AI assistant is busy right now due to high demand. Please wait a minute and try again.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // 404 or other error: try next endpoint
    }

    if (!geminiData) {
      return new Response(
        JSON.stringify({
          reply:
            lang === "ar"
              ? "عذراً، المساعد الذكي غير متاح مؤقتاً. حاول مرة أخرى لاحقاً. تذكر: استشر طبيبك أو الصيدلي دائماً."
              : "Sorry, the AI assistant is temporarily unavailable. Please try again later. Remember: always consult your doctor or pharmacist.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let reply = "";
    try {
      const candidates = geminiData?.candidates as Array<Record<string, unknown>> | undefined;
      const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
      const parts = content?.parts as Array<Record<string, unknown>> | undefined;
      reply = (parts?.[0]?.text as string) ?? "";
    } catch {
      reply = "";
    }
    if (!reply || !reply.trim()) {
      reply = lang === "ar"
        ? "عذراً، لم أتمكن من توليد رد. حاول مرة أخرى."
        : "Sorry, I could not generate a reply. Please try again.";
    }

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
