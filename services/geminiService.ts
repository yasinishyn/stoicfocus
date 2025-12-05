
import { GoogleGenAI } from "@google/genai";
import { Quote } from "../types";

export const getStoicQuote = async (category: string, apiKey: string): Promise<Quote | null> => {
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Generate a short, powerful Stoic quote relevant to someone trying to focus but getting distracted by ${category}.
      Strictly return JSON in this format: { "text": "The quote content", "author": "Seneca" }.
      Focus on Marcus Aurelius, Seneca, or Epictetus.
      Keep it under 20 words if possible.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    // Sanitize: Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonText) as Quote;
  } catch (error) {
    console.warn("Gemini Generation Skipped (Using Static):", error);
    return null;
  }
};
