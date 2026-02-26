import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// -------- Helper Functions --------
function robustParseJsonObject(text) {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("No valid JSON object found");
  let jsonString = text.substring(jsonStart, jsonEnd + 1);
  jsonString = jsonString.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    const lastObjEnd = jsonString.lastIndexOf("},");
    if (lastObjEnd === -1) throw e;
    const fixedStr = jsonString.slice(0, lastObjEnd + 1) + "}";
    return JSON.parse(fixedStr);
  }
}

function robustParseJsonArray(text) {
  text = text.replace(/``````/g, "");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("No valid JSON array found");
  let jsonStr = text.slice(start, end + 1);

  jsonStr = jsonStr.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const lastObjEnd = jsonStr.lastIndexOf("},");
    if (lastObjEnd === -1) throw e;
    const fixedStr = jsonStr.slice(0, lastObjEnd + 1) + "]";
    return JSON.parse(fixedStr);
  }
}

// -------- Gemini Functions --------
export async function getEnergyTipsFromGemini(billHistory, applianceUsage) {
  try {
    const prompt = `
Based on the following user's bill history and appliance usage, generate 5 actionable energy-saving tips in the following JSON array format:

[
  { "title": "...", "description": "...", "learnMore": "https://..." }
]

- Tips should be specific and personalized to the user's appliances and usage.
- Include potential savings if possible.
- Each tip must have a concise title, a practical description, and a relevant 'learnMore' URL.
- Do NOT include any text except the JSON array.

User Bill History: ${JSON.stringify(billHistory)}
User Appliance Usage: ${JSON.stringify(applianceUsage)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { maxOutputTokens: 600, temperature: 0.7 },
    });

    const tips = robustParseJsonArray(response.text);

    return (Array.isArray(tips) ? tips : []).map((tip) => ({
      title: tip.title || "",
      description: tip.description || "",
      learnMore: tip.learnMore || "https://www.energy.gov/energysaver/energy-saver",
    }));
  } catch (error) {
    console.error("Error generating energy tips:", error);
    throw new Error("Failed to generate energy-saving tips");
  }
}

export async function getCostStrategiesFromGemini(billHistory, applianceUsage) {
  try {
    const prompt = `
Based on the user's bill history and appliance usage, generate 7 actionable cost reduction strategies in the following JSON array format:

[
  {
    "title": "...",
    "summary": "...",
    "details": ["..."],
    "learnMore": "https://...",
    "problem": "...",
    "strategy": "...",
    "controls": ["..."]
  }
]

- Strategies should be specific and personalized.
- Do NOT include any text except the JSON array.

User Bill History: ${JSON.stringify(billHistory)}
User Appliance Usage: ${JSON.stringify(applianceUsage)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { maxOutputTokens: 700, temperature: 0.7 },
    });

    const strategies = robustParseJsonArray(response.text);

    return (Array.isArray(strategies) ? strategies : []).map((s) => ({
      title: s.title || "",
      summary: s.summary || "",
      details: Array.isArray(s.details) ? s.details : [],
      learnMore: s.learnMore || "https://www.energy.gov/energysaver/energy-saver",
      problem: s.problem || "",
      strategy: s.strategy || "",
      controls: Array.isArray(s.controls) ? s.controls : [],
    }));
  } catch (error) {
    console.error("Error generating cost reduction strategies:", error);
    throw new Error("Failed to generate cost reduction strategies");
  }
}

export async function getPredictionFromGemini(billHistory) {
  try {
    const prompt = `
You are an AI energy analyst. Based strictly on the user's monthly bill history array (use only "consumption"),
generate a 12-month energy usage prediction table and actionable insights.

Return a JSON object with:
- "predictionTable": [{ "month":"Jan", "currentConsumption":null|number, "predictedConsumption":number }]
- "insights": [{ "title":"...", "description":"..." }]

User Bill History: ${JSON.stringify(billHistory)}

Return ONLY the JSON object.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { maxOutputTokens: 950, temperature: 0.7 },
    });

    const parsed = robustParseJsonObject(response.text);

    if (!Array.isArray(parsed.predictionTable)) throw new Error("Missing/invalid predictionTable");
    if (!Array.isArray(parsed.insights)) throw new Error("Missing/invalid insights");

    return parsed;
  } catch (error) {
    console.error("Error generating prediction:", error);
    throw new Error("Failed to generate prediction");
  }
}

export async function getChatbotResponse(query, userData) {
  try {
    
    const prompt = `You are VoltBuddy... User Question: "${query}" ...`;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { maxOutputTokens: 1000, temperature: 0.7 },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting chatbot response:", error);
    return "I'm having trouble accessing your energy data right now. Please try again.";
  }
}