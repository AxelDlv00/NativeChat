import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { action, currentTopic, apiKey: clientKey } = await req.json();
    const apiKey = clientKey || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Clé manquante" }, { status: 401 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    let prompt = "";

    if (action === 'random') {
      prompt = `Invente un scénario de RP WeChat pour apprendre le chinois. 
      Écris un petit paragraphe narratif (2/3 phrases) pour expliquer la situation, en utilisant "je" et "tu" comme si c'était moi qui expliquait. Le scénario doit être dans la bonne humeur, avec un enjeu qui justifie la conversation. N'intègre rien de plus que ce paragraphe.
      Exemple : "Je suis ton voisin de palier et je t'envoie un message parce qu'il y a un bruit bizarre chez toi. Tu n'es pas là et tu paniques un peu. On essaie de comprendre ce qui se passe avant que j'appelle le gardien."`;
      
    } else if (action === 'improve') {
      prompt = `Prends cette base : "${currentTopic}" corrige les erreurs et transforme-la en une situation WeChat pleine de vie. 
      Écris un petit paragraphe narratif (2/3 phrases) pour expliquer la situation, en utilisant "je" et "tu" comme si c'était moi qui expliquait. Le scénario doit être dans la bonne humeur, avec un enjeu qui justifie la conversation. N'intègre rien de plus que ce paragraphe.
      Exemple : "Je suis ton voisin de palier et je t'envoie un message parce qu'il y a un bruit bizarre chez toi. Tu n'es pas là et tu paniques un peu. On essaie de comprendre ce qui se passe avant que j'appelle le gardien."`;
      
    } else if (action === 'title') {
      prompt = `Donne un titre court et évocateur (max 4 mots) pour ce scénario : "${currentTopic}". 
      Réponds uniquement par le titre.`;
    }

    const result = await model.generateContent(prompt);
    return NextResponse.json({ result: result.response.text().trim() });
  } catch (error) {
    return NextResponse.json({ error: "Erreur API" }, { status: 500 });
  }
}