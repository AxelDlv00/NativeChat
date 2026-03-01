import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { action, currentTopic, apiKey: clientKey, provider, model: selectedModel } = await req.json();
    const apiKey = clientKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);
    
    if (!apiKey) {
      return NextResponse.json({ error: `Clé ${provider} manquante` }, { status: 401 });
    }

    let prompt = "";
    const baseInstruction = `Écris un petit paragraphe narratif (2/3 phrases) pour expliquer la situation, en utilisant "je" et "tu" comme si c'était moi qui expliquait. Le scénario doit être dans la bonne humeur, avec un enjeu qui justifie la conversation. N'intègre rien de plus que ce paragraphe.`;

    if (action === 'random') {
      prompt = `Invente un scénario de RP WeChat/Whatsapp pour apprendre une langue. ${baseInstruction}`;
    } else if (action === 'improve') {
      prompt = `Prends cette base : "${currentTopic}", corrige les erreurs et transforme-la en une situation de RP WeChat/Whatsapp pleine de vie. ${baseInstruction}`;
    } else if (action === 'title') {
      prompt = `Donne un titre court et évocateur (max 4 mots) pour ce scénario : "${currentTopic}". Réponds uniquement par le titre.`;
    }

    let generatedText = "";

    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: selectedModel || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      });
      generatedText = response.choices[0].message.content || "";
      
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel || "gemini-2.5-flash-lite" });
      const result = await model.generateContent(prompt);
      generatedText = result.response.text();
    }

    return NextResponse.json({ result: generatedText.trim() });

  } catch (error: any) {
    console.error("Erreur API Details:", error);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}