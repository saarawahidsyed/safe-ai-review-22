import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { disease, comorbidities = [], currentMedications = [], patient = {} } = await req.json();
    if (!disease || typeof disease !== "string") {
      return new Response(JSON.stringify({ error: "disease is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an evidence-based clinical pharmacology assistant supporting pharmacovigilance review.
Given a primary disease, comorbidities, current medications, and patient profile, return:
1) Recommended first-line and alternative drugs (with dose ranges and rationale).
2) Drugs to AVOID due to comorbidities or interactions.
3) Predicted side effects per recommended drug with likelihood (Common / Uncommon / Rare) and severity.
4) Comorbidity-specific adjustments (e.g., renal/hepatic dose modification).
5) Monitoring parameters.
Output STRICT JSON matching the provided tool schema. Be concise but clinically precise. Always include a disclaimer that this is decision support, not a prescription.`;

    const userPrompt = `Primary disease: ${disease}
Comorbidities: ${comorbidities.length ? comorbidities.join(", ") : "None reported"}
Current medications: ${currentMedications.length ? currentMedications.join(", ") : "None"}
Patient: ${JSON.stringify(patient)}`;

    const tool = {
      type: "function",
      function: {
        name: "recommend_treatment",
        description: "Return drug recommendations and predicted side effects",
        parameters: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drug: { type: "string" },
                  line: { type: "string", enum: ["first-line", "alternative", "adjunct"] },
                  dose: { type: "string" },
                  rationale: { type: "string" },
                  comorbidityAdjustments: { type: "string" },
                  sideEffects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        effect: { type: "string" },
                        likelihood: { type: "string", enum: ["Common", "Uncommon", "Rare"] },
                        severity: { type: "string", enum: ["Mild", "Moderate", "Severe"] },
                      },
                      required: ["effect", "likelihood", "severity"],
                      additionalProperties: false,
                    },
                  },
                  monitoring: { type: "array", items: { type: "string" } },
                },
                required: ["drug", "line", "dose", "rationale", "sideEffects"],
                additionalProperties: false,
              },
            },
            avoid: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drug: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["drug", "reason"],
                additionalProperties: false,
              },
            },
            interactionAlerts: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            disclaimer: { type: "string" },
          },
          required: ["recommendations", "avoid", "summary", "disclaimer"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "recommend_treatment" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await resp.text();
      console.error("AI gateway error:", resp.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    let parsed: unknown = null;
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch (e) {
      console.error("Parse error:", e, args);
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prescribe-recommendations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});