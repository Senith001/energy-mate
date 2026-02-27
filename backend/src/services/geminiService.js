import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ===================== CONFIG ===================== */
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(apiKey);

/* ===================== CORE ===================== */
function getModel() {
  return genAI.getGenerativeModel({ model: MODEL });
}

function stripFences(text) {
  return (text || "").replace(/```json|```/gi, "").replace(/```/g, "").trim();
}

function extractTextFromResult(result) {
  // 1) official helper
  try {
    const t = result?.response?.text?.();
    if (t && t.trim()) return t;
  } catch (_) {}

  // 2) fallback: candidates -> parts -> text
  const parts = result?.response?.candidates?.[0]?.content?.parts || [];
  const joined = parts.map((p) => p?.text || "").join("").trim();
  return joined || "";
}

/**
 * Single request generator (no internal retries)
 * Caller controls retry count.
 */
async function generateOnce(prompt, { maxOutputTokens = 1200, temperature = 0.2 } = {}) {
  const model = getModel();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens,
      temperature,
      responseMimeType: "application/json", // ✅ force JSON output
      
      responseSchema: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          required: [
            "title",
            "problem",
            "recommendation",
            "expectedSavings",
            "implementation",
            "priority",
            "learnMore",
          ],
          properties: {
            title: { type: "string" },
            problem: { type: "string" },
            recommendation: { type: "string" },
            expectedSavings: {
              type: "object",
              required: ["unitsPerMonth", "costLKR"],
              properties: {
                unitsPerMonth: { type: "number" },
                costLKR: { type: "number" },
              },
            },
            implementation: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: { type: "string" },
            },
            priority: { type: "string" },
            learnMore: { type: "string" },
          },
        },
      },
    },
  });

  return extractTextFromResult(result);
}

/* ===================== JSON PARSERS ===================== */
function parseJsonArrayStrict(text) {
  const clean = stripFences(text);
  return JSON.parse(clean); 
}
function validateEnergyTipsArray(arr) {
  if (!Array.isArray(arr) || arr.length !== 5) {
    throw new Error("Gemini must return exactly 5 tips");
  }

  for (const t of arr) {
    if (!t || typeof t !== "object") throw new Error("Tip is not an object");
    if (!t.title || !t.problem || !t.recommendation) throw new Error("Missing required fields");
    if (!t.expectedSavings || typeof t.expectedSavings !== "object")
      throw new Error("Missing expectedSavings");
    if (typeof t.expectedSavings.unitsPerMonth !== "number")
      throw new Error("expectedSavings.unitsPerMonth must be a number");
    if (typeof t.expectedSavings.costLKR !== "number")
      throw new Error("expectedSavings.costLKR must be a number");
    if (!Array.isArray(t.implementation) || t.implementation.length !== 3)
      throw new Error("implementation must be an array of exactly 3 steps");
    if (!["High", "Medium", "Low"].includes(t.priority))
      throw new Error("priority must be High|Medium|Low");
    if (!t.learnMore || typeof t.learnMore !== "string")
      throw new Error("learnMore must be a URL string");
  }

  return true;
}

/* ===================== ENERGY TIPS (AI-ONLY, 1 RETRY) ===================== */
export async function getEnergyTipsFromGemini(billHistory, applianceUsage) {
  if (!Array.isArray(billHistory)) billHistory = [];
  if (!Array.isArray(applianceUsage)) applianceUsage = [];

  if (billHistory.length === 0 && applianceUsage.length === 0) {
    throw new Error("No billing/appliance data available to generate AI tips");
  }

const prompt = `
Return ONLY valid JSON. No markdown. No extra text.

Return a JSON array of EXACTLY 5 items.

Schema (use EXACT keys only):
[
  {
    "title": "string (max 8 words)",
    "problem": "string (max 20 words)",
    "recommendation": "string (max 30 words)",
    "expectedSavings": { "unitsPerMonth": number, "costLKR": number },
    "implementation": ["step 1 (max 10 words)", "step 2 (max 10 words)", "step 3 (max 10 words)"],
    "priority": "High" | "Medium" | "Low",
    "learnMore": "https://www.energy.gov/energysaver/energy-saver"
  }
]

Rules:
- Keep text SHORT to avoid truncation
- Use Sri Lanka context (LKR) and personalize using the provided data
- expectedSavings MUST be numbers only
- Keep every string short. No line breaks. Do not exceed 20 words per string.
Bill History: ${JSON.stringify(billHistory)}
Appliance Usage: ${JSON.stringify(applianceUsage)}
`;
  let lastErr = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await generateOnce(prompt, { maxOutputTokens: 2000, temperature: 0.2 });
      console.log(`✅ GEMINI RAW (energy tips) attempt ${attempt}:`, text);

      if (!text || text.trim().length === 0) {
        throw new Error("Gemini returned empty text");
      }

      const tips = parseJsonArrayStrict(text);
      validateEnergyTipsArray(tips);
      return tips;
    } catch (e) {
      lastErr = e;
      console.warn(`⚠️ Gemini tips failed (attempt ${attempt}):`, e?.message);

      // If rate-limited, do NOT retry immediately (wastes quota)
      const msg = String(e?.message || "");
      if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
        throw e;
      }
    }
  }

  throw lastErr || new Error("Gemini failed to generate valid tips");
}

/* ===================== KEEP THESE EXPORTS (avoid import crashes) ===================== */
function safeJsonExtract(text) {
  const clean = stripFences(text);

  // 1) direct parse
  try {
    return JSON.parse(clean);
  } catch (_) {}

  // 2) extract first JSON object {...}
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) {
    const slice = clean.slice(s, e + 1);
    return JSON.parse(slice);
  }

  throw new Error("Gemini returned non-JSON output");
}

export async function getCostStrategiesFromGemini(billHistory, applianceUsage) {
  if (!Array.isArray(billHistory)) billHistory = [];
  if (!Array.isArray(applianceUsage)) applianceUsage = [];

  if (billHistory.length === 0 && applianceUsage.length === 0) {
    throw new Error("No billing/appliance data available");
  }

  const prompt = `
Return ONLY valid JSON. No markdown. No extra text.

Return EXACTLY ONE cost reduction strategy.

Schema:
{
  "title": "string (max 8 words)",
  "summary": "string (max 20 words)",
  "details": ["string (max 10 words)","string (max 10 words)","string (max 10 words)"],
  "expectedSavings": { "unitsPerMonth": number, "costLKR": number },
  "priority": "High" | "Medium" | "Low",
  "learnMore": "https://www.energy.gov/energysaver/energy-saver"
}

Rules:
- Keep text SHORT (no paragraphs)
- No line breaks
- Sri Lanka household context (LKR)
- expectedSavings must be numbers only

Bill History: ${JSON.stringify(billHistory)}
Appliance Usage: ${JSON.stringify(applianceUsage)}
`;

  let lastErr = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = getModel();

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 900, 
          temperature: 0.2,
          responseMimeType: "application/json",
          
          responseSchema: {
            type: "object",
            required: ["title", "summary", "details", "expectedSavings", "priority", "learnMore"],
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              details: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: { type: "string" },
              },
              expectedSavings: {
                type: "object",
                required: ["unitsPerMonth", "costLKR"],
                properties: {
                  unitsPerMonth: { type: "number" },
                  costLKR: { type: "number" },
                },
              },
              priority: { type: "string" },
              learnMore: { type: "string" },
            },
          },
        },
      });

      const rawText = extractTextFromResult(result);
      console.log(`✅ GEMINI RAW (single cost strategy) attempt ${attempt}:`, rawText);

      const obj = safeJsonExtract(rawText);

      
      if (!obj || typeof obj !== "object") throw new Error("Invalid strategy object");
      if (!obj.title || !obj.summary) throw new Error("Invalid strategy: missing title/summary");
      if (!Array.isArray(obj.details) || obj.details.length !== 3) throw new Error("Invalid strategy: details must be 3 items");
      if (!obj.expectedSavings || typeof obj.expectedSavings !== "object") throw new Error("Invalid strategy: expectedSavings missing");

      const units = Number(obj.expectedSavings.unitsPerMonth);
      const cost = Number(obj.expectedSavings.costLKR);

      if (Number.isNaN(units) || Number.isNaN(cost)) {
        throw new Error("Invalid strategy: expectedSavings must be numbers");
      }

      return {
        title: String(obj.title),
        summary: String(obj.summary),
        details: obj.details.map((d) => String(d)).slice(0, 3),
        expectedSavings: { unitsPerMonth: units, costLKR: cost },
        priority: obj.priority,
        learnMore: obj.learnMore,
      };
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "");
      console.warn(`⚠️ Cost strategy failed (attempt ${attempt}):`, msg);

    
      if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
        throw e;
      }
    }
  }

  throw new Error(`Gemini failed to generate cost strategy: ${String(lastErr?.message || lastErr)}`);
}
export async function getPredictionFromGemini(billHistory) {
  if (!Array.isArray(billHistory)) billHistory = [];

  if (billHistory.length === 0) {
    throw new Error("Not enough bill history to generate predictions");
  }

  const prompt = `
Return ONLY valid JSON. No markdown. No extra text.

Return a JSON object exactly like:
{
  "predictionTable": [
    { "year": number, "month": number, "predictedConsumption": number }
  ],
  "insights": [
    { "title": string, "description": string }
  ]
}

Rules:
- predictionTable MUST have exactly 12 items (next 12 months)
- Use the bill history trend to predict realistic values
- Keep descriptions short and clear

Bill History: ${JSON.stringify(billHistory)}
`;

  let lastErr = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = getModel();

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1700,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            required: ["predictionTable", "insights"],
            properties: {
              predictionTable: {
                type: "array",
                minItems: 12,
                maxItems: 12,
                items: {
                  type: "object",
                  required: ["year", "month", "predictedConsumption"],
                  properties: {
                    year: { type: "number" },
                    month: { type: "number" },
                    predictedConsumption: { type: "number" },
                  },
                },
              },
              insights: {
                type: "array",
                minItems: 2,
                maxItems: 6,
                items: {
                  type: "object",
                  required: ["title", "description"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
        },
      });

      const text = extractTextFromResult(result);
      console.log(`✅ GEMINI RAW (prediction) attempt ${attempt}:`, text);

      const clean = stripFences(text);
      const obj = JSON.parse(clean);

      if (!Array.isArray(obj.predictionTable) || obj.predictionTable.length !== 12) {
        throw new Error("predictionTable must contain exactly 12 items");
      }
      if (!Array.isArray(obj.insights) || obj.insights.length < 1) {
        throw new Error("insights must be an array");
      }

      return obj;
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "");
      console.warn(`⚠️ Prediction failed (attempt ${attempt}):`, msg);

      if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
        throw e;
      }
    }
  }

  throw lastErr || new Error("Gemini failed to generate prediction");
}

export async function getChatbotResponse(query, userData) {
  const prompt = `
Return ONLY valid JSON. No markdown. No extra text.

Return format:
{ "answer": string }

Rules:
- Keep answer short and practical (max 80 words)
- Use user's energy data if provided

User data: ${JSON.stringify(userData || {})}
Question: ${String(query || "")}
`;

  let lastErr = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = getModel();

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 700,
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            required: ["answer"],
            properties: {
              answer: { type: "string" },
            },
          },
        },
      });

      const text = extractTextFromResult(result);
      console.log(`✅ GEMINI RAW (chatbot) attempt ${attempt}:`, text);

      const clean = stripFences(text);
      const obj = JSON.parse(clean);
      return obj.answer || "";
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "");
      console.warn(`⚠️ Chatbot failed (attempt ${attempt}):`, msg);

      if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
        throw e;
      }
    }
  }

  throw lastErr || new Error("Gemini chatbot failed");
}