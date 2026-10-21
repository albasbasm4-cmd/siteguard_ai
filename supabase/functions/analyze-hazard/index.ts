const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Models the client may request. Quotas are per-model, so rotating between
// them when one is exhausted lets the user keep analyzing images.
const ALLOWED_MODELS: Record<string, string> = {
  "gemini-3.8-flash": "Gemini 3.8 Flash",
  "gemini-3.7-flash": "Gemini 3.7 Flash",
  "gemini-3.6-flash": "Gemini 3.6 Flash",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash Lite",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
};
const DEFAULT_MODEL = "gemini-3.5-flash";
// Fallback order when a model is overloaded/unavailable (503/404) or quota-exhausted (429).
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

// Prefer the secret store; fall back to the key provided by the project owner
// (server-side only — this file never ships to the browser).
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "AQ.Ab8RN6LVKhWcG1XpzaLi4lgcMm2g1s9DEp0ap6Y7wuJl4BA-fA";

const HAZARD_IDS = [
  // Exit routes (Subpart E)
  "blocked_exit",
  "locked_emergency_door",
  "missing_exit_sign",
  // Fire protection (Subpart L)
  "expired_extinguisher",
  "blocked_fire_extinguisher",
  // Electrical (Subpart S)
  "damaged_wiring",
  "blocked_electrical_panel",
  "missing_junction_cover",
  "flexible_cord_permanently_used",
  "missing_gfci_protection",
  // Walking-working surfaces / fall (Subpart D)
  "unmarked_walkway",
  "cluttered_aisle",
  "spill_hazard",
  "unguarded_floor_opening",
  "missing_mezzanine_guardrail",
  // Hazardous materials (Subpart H & Z)
  "unlabeled_chemical_container",
  "missing_sds_binder",
  "missing_eyewash_station",
  "unsecured_gas_cylinder",
  // PPE (Subpart I)
  "missing_ppe",
  "missing_respiratory_program",
  "missing_eye_protection",
  // Machine guarding & LOTO (Subpart O & J)
  "missing_machine_guarding",
  "missing_loto_procedure",
  "missing_bench_grinder_guard",
  // Materials handling (Subpart N)
  "unstable_material_storage",
  "operating_damaged_forklift",
  "untrained_forklift_operator",
  // Medical & first aid (Subpart J & K)
  "insufficient_first_aid_supplies",
  "blocked_safety_shower",
];

const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64_LENGTH = 2_000_000;
const MODEL_TIMEOUT_MS = 12_000;

const PROMPT = `You are a workplace safety inspector AI. Analyze this image and classify it into exactly ONE of these 3 categories:

1. "irrelevant" - The image is completely unrelated to industrial, warehouse, or site safety inspection (e.g., selfies, pets, people portraits, landscapes, food, random objects, documents, screenshots).

2. "no_hazard" - The image IS an industrial/site/warehouse/facility image, but it is fully compliant, clean, and safe with no safety violations visible.

3. "hazard" - The image shows a real safety violation matching exactly one of these 30 hazard IDs:
   [blocked_exit, locked_emergency_door, missing_exit_sign, expired_extinguisher, blocked_fire_extinguisher, damaged_wiring, blocked_electrical_panel, missing_junction_cover, flexible_cord_permanently_used, missing_gfci_protection, unmarked_walkway, cluttered_aisle, spill_hazard, unguarded_floor_opening, missing_mezzanine_guardrail, unlabeled_chemical_container, missing_sds_binder, missing_eyewash_station, unsecured_gas_cylinder, missing_ppe, missing_respiratory_program, missing_eye_protection, missing_machine_guarding, missing_loto_procedure, missing_bench_grinder_guard, unstable_material_storage, operating_damaged_forklift, untrained_forklift_operator, insufficient_first_aid_supplies, blocked_safety_shower]

Rules:
- If category is "irrelevant", hazard_type must be "none".
- If category is "no_hazard", hazard_type must be "none".
- If category is "hazard", hazard_type must be exactly one of the 30 IDs.
- Only classify "hazard" when a violation is clearly visible, not borderline.
- short_reason: clear, concise explanation in English only (max 20 words). Never output Arabic or any non-English text.

Respond ONLY with JSON: {"category": "hazard"|"no_hazard"|"irrelevant", "hazard_type": "<id_or_none>", "confidence": <0_to_1>, "short_reason": "<english>"}. No markdown, no extra text.`;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function extractJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const unfenced = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(unfenced) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    let body: { image_base64?: unknown; mime_type?: unknown; model?: unknown };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const mimeType = typeof body?.mime_type === "string" && body.mime_type
      ? body.mime_type
      : "image/jpeg";
    if (!VALID_MIME_TYPES.includes(mimeType)) {
      return errorResponse("Unsupported mime_type", 400);
    }

    let imageBase64 = body?.image_base64;
    if (typeof imageBase64 !== "string") {
      return errorResponse("Invalid image_base64", 400);
    }
    // Strip "data:image/...;base64," prefix if present
    if (imageBase64.startsWith("data:")) {
      const commaIdx = imageBase64.indexOf(",");
      if (commaIdx > 0) imageBase64 = imageBase64.slice(commaIdx + 1);
    }
    if (imageBase64.length === 0 || imageBase64.length > MAX_BASE64_LENGTH) {
      return errorResponse("Invalid image_base64", 400);
    }

    const requestedModel = typeof body?.model === "string" ? body.model : "";

    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return errorResponse("AI service not configured", 500);
    }

    const tryModels = requestedModel && ALLOWED_MODELS[requestedModel]
      ? [requestedModel, ...FALLBACK_MODELS.filter((m) => m !== requestedModel)]
      : [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)];

    let model = "";
    let text = "";
    let lastStatus = 0;

    for (const candidate of tryModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

      let modelRes: Response;
      try {
        modelRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: PROMPT },
                    { inline_data: { mime_type: mimeType, data: imageBase64 } },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                responseMimeType: "application/json",
                maxOutputTokens: 2048,
              },
            }),
          }
        );
      } catch (err) {
        clearTimeout(timeoutId);
        const aborted = err instanceof Error && err.name === "AbortError";
        console.error(`${candidate}: ${aborted ? "timeout" : "network failure"}`);
        lastStatus = aborted ? 504 : 502;
        continue;
      }
      clearTimeout(timeoutId);

      if (!modelRes.ok) {
        lastStatus = modelRes.status;
        console.error(`${candidate}: Gemini API status ${modelRes.status}`);
        continue;
      }

      const modelData = await modelRes.json();
      const candidateText: string = modelData?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? "")
        .join("") ?? "";

      if (!candidateText) {
        lastStatus = 502;
        console.error(`${candidate}: empty response`);
        continue;
      }

      if (!extractJson(candidateText)) {
        lastStatus = 502;
        console.error(`${candidate}: unparseable response`);
        continue;
      }

      model = candidate;
      text = candidateText;
      break;
    }

    if (!model || !text) {
      console.error(`All models failed, last status ${lastStatus}`);
      return errorResponse("AI service error", lastStatus === 504 ? 504 : 502);
    }

    const parsed = extractJson(text);
    if (!parsed) {
      console.error("Failed to parse model output: status 502");
      return errorResponse("Invalid AI response", 502);
    }

    const VALID_CATEGORIES = ["hazard", "no_hazard", "irrelevant"];
    let category = typeof parsed.category === "string" && VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : null;

    const rawType = typeof parsed.hazard_type === "string" ? parsed.hazard_type : "none";
    let hazardType = rawType === "none" || HAZARD_IDS.includes(rawType) ? rawType : "none";

    // Enforce consistency between category and hazard_type
    if (category === "irrelevant" || category === "no_hazard") {
      hazardType = "none";
    } else if (category === "hazard" && hazardType === "none") {
      // Model said hazard but no valid ID; treat as no_hazard to avoid false pin
      category = "no_hazard";
    } else if (!category) {
      // Missing/invalid category: infer from hazard_type
      category = hazardType === "none" ? "irrelevant" : "hazard";
    }

    const rawConfidence = parsed.confidence;
    let confidence = 0;
    if (typeof rawConfidence === "number" && Number.isFinite(rawConfidence)) {
      confidence = Math.min(1, Math.max(0, rawConfidence));
    } else if (typeof rawConfidence === "string") {
      const n = Number.parseFloat(rawConfidence);
      if (Number.isFinite(n)) confidence = Math.min(1, Math.max(0, n));
    }

    const shortReason = typeof parsed.short_reason === "string"
      ? truncateWords(parsed.short_reason, 25)
      : "";

    console.log("analyze-hazard: status 200", { model });
    return json(
      {
        category,
        hazard_type: hazardType,
        confidence,
        short_reason_en: shortReason,
        model,
      },
      200
    );
  } catch (err) {
    console.error(`analyze-hazard error: ${err instanceof Error ? err.message : "unknown"}`);
    return errorResponse("Internal server error", 500);
  }
});
