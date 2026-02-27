import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { text, apiKey: clientKey } = await req.json(); // Récupère la clé du client

    // Priorité à la clé envoyée par le client, sinon celle du .env
    const apiKey = clientKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        translation: "[Erreur: Aucune clé API trouvée (Client ou Serveur)]" 
      }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `Traduis ce texte chinois en français de manière naturelle. 
    Ne donne QUE la traduction, rien d'autre.
    Texte : "${text}"`;

    const result = await model.generateContent(prompt);
    const translation = result.response.text().trim();

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Translation API Error:", error);
    return NextResponse.json({ translation: "[Erreur de traduction]" }, { status: 500 });
  }
}