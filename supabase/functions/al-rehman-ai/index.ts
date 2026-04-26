/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userMessage, productContext } = await req.json()

    // Retrieve keys from Supabase Vault (Environment Variables)
    // Ensure these names match EXACTLY what you entered in the Vault Dashboard
    const AI_PROVIDERS = [
      {
        name: 'Groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: Deno.env.get('GROQ_API_KEY'),
        model: 'llama-3.3-70b-versatile',
        isGeminiNative: false
      },
      {
        name: 'Gemini',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        key: Deno.env.get('GEMINI_API_KEY'),
        isGeminiNative: true
      },
      {
        name: 'OpenRouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: Deno.env.get('OPENROUTER_API_KEY'),
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        isGeminiNative: false
      },
      {
        name: 'SiliconFlow',
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        key: Deno.env.get('SILICON_API_KEY'),
        model: 'deepseek-ai/DeepSeek-V3',
        isGeminiNative: false
      }
    ];

    const systemInstructions = `
You are the AI Assistant for Al-Rehman Dawakhana, acting as the digital representative for Hakeem Usman in Sargodha.
Your persona is: Helpful, polite, empathetic, and deeply knowledgeable in Unani/Herbal medicine.

KNOWLEDGE BASE (Current Products):
${productContext}

RULES OF ENGAGEMENT:
1. Professional Identity: Always represent Hakeem Usman and Al-Rehman Dawakhana.
2. Health Advice: If a user describes symptoms, suggest the most relevant product from the catalog.
3. Consultation: Mention that Hakeem Usman is available for detailed personal consultations.
4. Ordering: Guide users to click "Order Now" on product cards.
5. Tone: Respectful Urdu-infused English (Assalam-o-Alaikum, etc.).
6. Conciseness: Keep answers informative but brief.
    `;

    // Implementation of Fallback Loop
    for (const provider of AI_PROVIDERS) {
      if (!provider.key) {
        console.warn(`Skipping ${provider.name}: API Key missing in environment variables.`);
        continue;
      }

      try {
        console.log(`Attempting with ${provider.name}...`);
        
        let response;
        if (provider.isGeminiNative) {
          response = await fetch(`${provider.url}?key=${provider.key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemInstructions + "\n\nUser Question: " + userMessage }] }]
            })
          });
        } else {
          response = await fetch(provider.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${provider.key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: provider.model,
              messages: [
                { role: 'system', content: systemInstructions },
                { role: 'user', content: userMessage }
              ],
              temperature: 0.7
            })
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`${provider.name} error:`, errorData);
          continue; // Try next provider
        }

        const result = await response.json();
        const aiText = provider.isGeminiNative 
          ? result.candidates?.[0]?.content?.parts?.[0]?.text 
          : result.choices?.[0]?.message?.content;

        if (aiText) {
          return new Response(JSON.stringify({ text: aiText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (err) {
        console.error(`${provider.name} fetch failed:`, err);
      }
    }

    return new Response(JSON.stringify({ text: "Assalam-o-Alaikum. I'm taking a short break. Please contact Hakeem Usman on WhatsApp (+92 300 6047058) for urgent help." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
