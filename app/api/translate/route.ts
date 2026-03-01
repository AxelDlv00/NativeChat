import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai'; 

export async function POST(req: Request) {
  try {
    const { text, apiKey: clientKey, model: selectedModel, provider } = await req.json(); 
    const apiKey = clientKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);
    
    if (!apiKey) {
      return NextResponse.json({ 
        translation: "[Erreur: Aucune clé API trouvée]" 
      }, { status: 401 });
    }

    let translation = "";

    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: selectedModel || "gpt-4o-mini", 
        messages: [
          { role: "system", content: "Tu es un traducteur expert. Traduis le texte suivant en français de manière naturelle. Ne réponds QUE par la traduction." },
          { role: "user", content: text }
        ],
        temperature: 0.3,
      });
      translation = response.choices[0]?.message?.content?.trim() || "";
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: selectedModel || "gemini-2.5-flash-lite"
      });

      const prompt = `Traduis ce texte en français de manière naturelle. 
      Ne donne QUE la traduction, rien d'autre.
      Texte : "${text}"`;

      const result = await model.generateContent(prompt);
      translation = result.response.text().trim();
    }

    return NextResponse.json({ translation });
  } catch (error: any) {
    console.error("Translation API Error:", error);
    return NextResponse.json({ 
      translation: `[Erreur de traduction: ${error.message || 'Inconnue'}]` 
    }, { status: 500 });
  }
}