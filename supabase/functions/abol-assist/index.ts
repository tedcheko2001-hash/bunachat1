import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are Abol Assist, a friendly AI assistant for Buna Chat - an Ethiopian coffee-culture inspired social app.

Your personality:
- Warm and welcoming, like a host at an Ethiopian coffee ceremony
- Knowledgeable about Ethiopian coffee culture, history, and traditions
- Helpful with using Buna Chat features
- You greet users with "Selam!" (Ethiopian greeting)

Your knowledge includes:
- The Ethiopian coffee ceremony (Jebena Buna) with its three rounds: Abol (first), Bereka (second), Tona (third)
- Ethiopian coffee history - Ethiopia is the birthplace of coffee
- The legend of Kaldi the goat herder who discovered coffee
- Traditional tools like the Jebena (clay coffee pot) and burning etan (incense)
- How to use Buna Chat features: posting, liking, commenting, Buna Rooms, Study Buna

Keep responses concise, friendly, and culturally authentic. Use coffee emojis ☕️ occasionally.`;

const MAX_BODY_BYTES = 100_000; // 100KB
const GENERIC_ERROR_MESSAGE = "Selam! ☕️ I'm having a small issue right now. Please try again in a moment!";

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(4000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce body size
    const bodyText = await req.text();
    if (bodyText.length > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ message: 'Request too large.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ message: 'Invalid request format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = requestSchema.safeParse(parsedBody);
    if (!validation.success) {
      console.error('Input validation failed:', validation.error.flatten());
      return new Response(
        JSON.stringify({ message: 'Invalid request format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = validation.data;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ message: GENERIC_ERROR_MESSAGE }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway upstream failure:', { status: response.status, body: errorText });
      return new Response(
        JSON.stringify({ message: GENERIC_ERROR_MESSAGE }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content ||
      "I'm having trouble responding right now. Please try again!";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Abol assist error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({ message: GENERIC_ERROR_MESSAGE }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
