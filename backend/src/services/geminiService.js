// src/services/geminiService.js
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
 * IMPORTANT:
 * - We DO NOT force JSON via responseSchema/responseMimeType.
 * - We request SHORT PLAIN TEXT and we convert to JSON ourselves.
 * This avoids truncated invalid JSON from provider.
 */
async function generateOnce(prompt, { maxOutputTokens = 260, temperature = 0.2 } = {}) {
  const model = getModel();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens,
      temperature,
    },
  });

  return extractTextFromResult(result);
}

/* ===================== HELPERS ===================== */
function cleanText(t) {
  return stripFences(String(t || "")).replace(/\r/g, "").trim();
}

function buildSummary(billHistory = [], applianceUsage = []) {
  const last = billHistory[billHistory.length - 1] || null;

  const avgUnits =
    billHistory.length > 0
      ? Math.round(
          billHistory.reduce((s, b) => s + (Number(b.totalUnits) || 0), 0) / billHistory.length
        )
      : 0;

  const avgCost =
    billHistory.length > 0
      ? Math.round(
          billHistory.reduce((s, b) => s + (Number(b.totalCost) || 0), 0) / billHistory.length
        )
      : 0;

  const appliancesSample = (applianceUsage || [])
    .slice(0, 6)
    .map((a) => ({
      name: a?.name ?? "Unknown",
      wattage: typeof a?.wattage === "number" ? a.wattage : null,
      quantity: typeof a?.quantity === "number" ? a.quantity : 1,
      hours:
        typeof a?.usedHoursPerDay === "number"
          ? a.usedHoursPerDay
          : typeof a?.defaultHoursPerDay === "number"
          ? a.defaultHoursPerDay
          : 0,
    }));

  return {
    billsCount: billHistory.length,
    lastMonth: last ? `${last.year}-${String(last.month).padStart(2, "0")}` : null,
    lastUnits: last?.totalUnits ?? null,
    lastCostLKR: last?.totalCost ?? null,
    avgMonthlyUnits: avgUnits,
    avgMonthlyCostLKR: avgCost,
    appliancesSample,
  };
}

/* ===================== TEXT -> JSON PARSERS (TRUNCATION TOLERANT) ===================== */
function parseTipsFromText(text) {
  // Expected format:
  // 1) Title - Recommendation (Savings: <kWh> kWh, LKR <amount>) steps: a | b | c priority: High|Medium|Low
  const lines = cleanText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tips = [];

  for (const line of lines) {
    const m = line.match(/^\s*\d+\)\s*(.+)$/);
    if (!m) continue;

    const raw = m[1].trim();

    // Split "Title - rest"
    const [titlePart, rest = ""] = raw.split(" - ");
    const title = (titlePart || "Energy saving tip").trim().slice(0, 80);

    // Priority (optional)
    const pr = (rest.match(/priority\s*:\s*(High|Medium|Low)/i) || [])[1];
    const priority = pr ? pr[0].toUpperCase() + pr.slice(1).toLowerCase() : "Medium";

    // Steps (optional)
    const stepsRaw = (rest.match(/steps\s*:\s*([^p]+)$/i) || [])[1] || "";
    const steps = stepsRaw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    // Savings
    const kwh = Number((rest.match(/(\d+(\.\d+)?)\s*kwh/i) || [])[1] || 0);
    const lkr = Number((rest.match(/lkr\s*(\d+(\.\d+)?)/i) || [])[1] || 0);

    // Recommendation text (strip parentheses/extra tags)
    let recommendation = rest
      .replace(/\(.*?\)/g, "")
      .replace(/Savings:.*$/i, "")
      .replace(/steps\s*:.*$/i, "")
      .replace(/priority\s*:.*$/i, "")
      .trim();

    if (!recommendation) recommendation = "Reduce usage to save electricity.";
    recommendation = recommendation.slice(0, 160);

    while (steps.length < 3) steps.push("Apply this habit daily");

    tips.push({
      title,
      problem: "High electricity usage",
      recommendation,
      expectedSavings: {
        unitsPerMonth: Number.isFinite(kwh) && kwh > 0 ? kwh : 10,
        costLKR: Number.isFinite(lkr) && lkr > 0 ? lkr : 500,
      },
      implementation: steps.slice(0, 3),
      priority,
      learnMore: "https://www.energy.gov/energysaver/energy-saver",
    });

    if (tips.length === 5) break;
  }

  // If response got truncated and we have <5, pad safely
  const pad = [
    {
      title: "Reduce standby power",
      problem: "Idle devices still use power",
      recommendation: "Unplug chargers; use a power strip.",
      expectedSavings: { unitsPerMonth: 8, costLKR: 400 },
      implementation: ["List idle devices", "Use power strip", "Switch off nightly"],
      priority: "Low",
      learnMore: "https://www.energy.gov/energysaver/energy-saver",
    },
    {
      title: "Use fans before AC",
      problem: "Cooling uses high units",
      recommendation: "Prefer fan; increase AC temp to 26°C.",
      expectedSavings: { unitsPerMonth: 18, costLKR: 900 },
      implementation: ["Use fan first", "Set AC 26°C", "Close doors/windows"],
      priority: "High",
      learnMore: "https://www.energy.gov/energysaver/energy-saver",
    },
    {
      title: "Batch cooking",
      problem: "Repeated cooking wastes energy",
      recommendation: "Cook in batches; reheat efficiently.",
      expectedSavings: { unitsPerMonth: 6, costLKR: 300 },
      implementation: ["Plan meals", "Cook in batches", "Use lids always"],
      priority: "Medium",
      learnMore: "https://www.energy.gov/energysaver/energy-saver",
    },
  ];

  let i = 0;
  while (tips.length < 5) {
    tips.push(pad[i % pad.length]);
    i++;
  }

  return tips.slice(0, 5);
}

function parseStrategyFromText(text) {
  // Expected 4 lines:
  // Title: ...
  // Summary: ...
  // Details: a | b | c
  // Savings: <kWh> kWh, LKR <amount>
  const t = cleanText(text);

  const title =
    (t.match(/title\s*:\s*(.+)/i) || [])[1]?.trim()?.slice(0, 80) || "Reduce peak-time usage";
  const summary =
    (t.match(/summary\s*:\s*(.+)/i) || [])[1]?.trim()?.slice(0, 140) ||
    "Lower your monthly electricity bill";
  const detailsLine = (t.match(/details\s*:\s*(.+)/i) || [])[1] || "";
  const details = detailsLine
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const kwh = Number((t.match(/(\d+(\.\d+)?)\s*kwh/i) || [])[1] || 15);
  const lkr = Number((t.match(/lkr\s*(\d+(\.\d+)?)/i) || [])[1] || 800);

  while (details.length < 3) details.push("Apply one change weekly");

  return {
    title,
    summary,
    details,
    expectedSavings: {
      unitsPerMonth: Number.isFinite(kwh) && kwh > 0 ? kwh : 15,
      costLKR: Number.isFinite(lkr) && lkr > 0 ? lkr : 800,
    },
    priority: "Medium",
    learnMore: "https://www.energy.gov/energysaver/energy-saver",
  };
}

/* ===================== ENERGY TIPS ===================== */
export async function getEnergyTipsFromGemini(billHistory, applianceUsage) {
  if (!Array.isArray(billHistory)) billHistory = [];
  if (!Array.isArray(applianceUsage)) applianceUsage = [];

  if (billHistory.length === 0 && applianceUsage.length === 0) {
    throw new Error("No billing/appliance data available to generate AI tips");
  }

  const summary = buildSummary(billHistory, applianceUsage);

  const prompt = `
You are an energy saving assistant in Sri Lanka (LKR).
Using the data below, output ONLY 5 numbered lines. No JSON. No extra text.

FORMAT EXACTLY:
1) <Title> - <Recommendation> (Savings: <kWh> kWh, LKR <amount>) steps: <a> | <b> | <c> priority: <High|Medium|Low>
2) ...
3) ...
4) ...
5) ...

Rules:
- Keep each line SHORT.
- Use realistic savings for this home.
- Do not output anything before line 1 or after line 5.

Data: ${JSON.stringify(summary)}
`.trim();

  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await generateOnce(prompt, {
        maxOutputTokens: attempt === 3 ? 220 : 260,
        temperature: attempt === 3 ? 0 : 0.2,
      });

      console.log(`✅ GEMINI RAW (energy tips text) attempt ${attempt}:`, text);

      if (!text || !text.trim()) throw new Error("Gemini returned empty text");

      return parseTipsFromText(text);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "");
      console.warn(`⚠️ Gemini tips failed (attempt ${attempt}):`, msg);

      if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
        throw e;
      }
    }
  }

  throw lastErr || new Error("Gemini failed to generate tips");
}

/* ===================== COST STRATEGY ===================== */
export async function getCostStrategiesFromGemini(billHistory, applianceUsage) {
  if (!Array.isArray(billHistory)) billHistory = [];
  if (!Array.isArray(applianceUsage)) applianceUsage = [];

  if (billHistory.length === 0 && applianceUsage.length === 0) {
    throw new Error("No billing/appliance data available");
  }

  const summary = buildSummary(billHistory, applianceUsage);

  const prompt = `
You are an energy cost reduction assistant in Sri Lanka (LKR).
Using the data below, output ONLY 4 lines (plain text). No JSON. No extra text.

Title: <short title>
Summary: <short summary>
Details: <step1> | <step2> | <step3>
Savings: <kWh> kWh, LKR <amount>

Rules:
- Keep lines short.
- Details must have exactly 3 items separated by "|".
- Use realistic savings.

Data: ${JSON.stringify(summary)}
`.trim();

  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const text = await generateOnce(prompt, {
        maxOutputTokens: attempt === 3 ? 170 : 220,
        temperature: attempt === 3 ? 0 : 0.2,
      });

      console.log(`✅ GEMINI RAW (cost strategy text) attempt ${attempt}:`, text);

      if (!text || !text.trim()) throw new Error("Gemini returned empty text");

      return parseStrategyFromText(text);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || "");
      console.warn(`⚠️ Cost strategy failed (attempt ${attempt}):`, msg);

      if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
        throw e;
      }
    }
  }

  throw lastErr || new Error("Gemini failed to generate cost strategy");
}

/* ===================== PREDICTION ===================== */
export async function getPredictionFromGemini(billHistory) {
  if (!Array.isArray(billHistory)) billHistory = [];
  if (billHistory.length === 0) {
    throw new Error("Not enough bill history to generate predictions");
  }

  // keep prompt small
  const recent = billHistory.slice(-12);
  const last = recent[recent.length - 1] || {};

  const baseYear = Number(last?.year) || new Date().getFullYear();
  const baseMonth = Number(last?.month) || (new Date().getMonth() + 1);

  // baseline from last month usage
  const baseline = Number(last?.totalUnits ?? last?.consumption ?? 100);

  // if you have multiple months, compute a simple trend (avg of last 3)
  const last3 = recent.slice(-3).map((b) => Number(b?.totalUnits ?? b?.consumption ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  const avg3 = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : baseline;

  // bounds for clamping (avoid 1kWh etc.)
  const minOk = Math.max(30, Math.round(avg3 * 0.4));
  const maxOk = Math.round(avg3 * 1.6);

  const prompt = `
Using the bill history, output ONLY 12 lines. No extra text.

FORMAT EXACTLY (12 lines):
YYYY-MM,<kWh>

Rules:
- Exactly 12 lines.
- Months must be next 12 months after ${baseYear}-${String(baseMonth).padStart(2, "0")}.
- kWh must be a number.
- kWh must be within ${minOk} and ${maxOk}.

Bill history: ${JSON.stringify(recent)}
`.trim();

  const text = await generateOnce(prompt, { maxOutputTokens: 260, temperature: 0.2 });
  console.log("✅ GEMINI RAW (prediction csv):", text);

  const out = cleanText(text);
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);

  // helper: compute correct next month by index (1..12)
  function nextYM(idx) {
    let mm = baseMonth + idx; // idx 1 => next month
    let yy = baseYear;
    while (mm > 12) {
      mm -= 12;
      yy += 1;
    }
    return { yy, mm };
  }

  const table = [];
  const seenYM = new Set();

  for (const l of lines) {
    const m = l.match(/^(\d{4})-(\d{2})\s*,\s*([0-9]+(\.[0-9]+)?)$/);
    if (!m) continue;

    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const key = `${yy}-${String(mm).padStart(2, "0")}`;
    if (seenYM.has(key)) continue; // avoid duplicate months

    let val = Number(m[3]);
    if (!Number.isFinite(val)) continue;

    // clamp unrealistic values
    if (val < minOk || val > maxOk) val = avg3 || baseline;

    table.push({ year: yy, month: mm, predictedConsumption: Math.round(val) });
    seenYM.add(key);

    if (table.length === 12) break;
  }

  // If Gemini missed months or returned wrong months, rebuild using correct schedule
  // Keep any values we got, but ensure months are exactly next 12 months.
  const valueMap = new Map(
    table.map((r) => [`${r.year}-${String(r.month).padStart(2, "0")}`, r.predictedConsumption])
  );

  const finalTable = [];
  for (let i = 1; i <= 12; i++) {
    const { yy, mm } = nextYM(i);
    const key = `${yy}-${String(mm).padStart(2, "0")}`;

    const v = valueMap.get(key);
    finalTable.push({
      year: yy,
      month: mm,
      predictedConsumption: Number.isFinite(v) ? v : Math.round(avg3 || baseline),
    });
  }

  // Insights: make them data-aware if possible
  const trendText =
    last3.length >= 2
      ? (last3[last3.length - 1] > last3[0] ? "upward" : last3[last3.length - 1] < last3[0] ? "downward" : "stable")
      : "stable";

  const insights = [
    {
      title: "Trend",
      description:
        last3.length >= 2
          ? `Your recent usage trend looks ${trendText}. Keeping habits consistent will help stabilize kWh.`
          : "Predictions follow your latest bill usage (limited history). Add more bills for better trend accuracy.",
    },
    {
      title: "Action",
      description: "Reduce high-use appliance hours (fans/AC/heaters) to lower next months' kWh.",
    },
  ];

  return { predictionTable: finalTable, insights };
}
/* ===================== CHATBOT ===================== */
export async function getChatbotResponse(query, userData) {
  const prompt = `
Answer the user question using the data if useful.
Output ONLY one line as: ANSWER: <text>
Keep it under 80 words.

User data: ${JSON.stringify(userData || {})}
Question: ${String(query || "")}
`.trim();

  const text = await generateOnce(prompt, { maxOutputTokens: 160, temperature: 0.4 });
  console.log("✅ GEMINI RAW (chatbot text):", text);

  const t = cleanText(text);
  const m = t.match(/answer\s*:\s*(.+)/i);
  return (m ? m[1] : t).trim();
}