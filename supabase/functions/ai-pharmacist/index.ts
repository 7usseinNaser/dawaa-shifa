import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Simple in-memory rate limiting (per user ID)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const MAX_INPUT_CHARS = 2000;
const MAX_MESSAGES = 20;

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
    // 1. JWT Authentication — verify the user is signed in
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

    // 2. Rate limiting per user
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

    // 3. Input validation
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

    // 4. Read API key securely from environment
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

    // 5. Call Groq API securely from server-side
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
