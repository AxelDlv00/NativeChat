import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type ActionType = 'correction' | 'explanation' | 'examples' | 'content' | 'regenerate';

export interface ChatContext {
  role: 'user' | 'assistant';
  content: string;
}

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    // return localStorage.getItem('OPENAI_API_KEY') || "";
    return localStorage.getItem('GEMINI_API_KEY') || "";
  }
  // return process.env.OPENAI_API_KEY || "";
  return process.env.GEMINI_API_KEY || "";
};

export async function generateAIStreamingContent(
  type: ActionType,
  targetMessage: string,
  history: ChatContext[],
  onChunk: (text: string) => void,
  topic?: string | null
): Promise<string> {
  const modelId = typeof window !== 'undefined' ? localStorage.getItem('SELECTED_MODEL') || 'gemini-2.5-flash-lite' : 'gemini-2.5-flash-lite';
  const isOpenAI = modelId.startsWith('gpt');
  console.log(`AI REQUEST: Using model [${modelId}] for action [${type}]`);
  
  const apiKey = isOpenAI 
    ? localStorage.getItem('OPENAI_API_KEY') 
    : localStorage.getItem('GEMINI_API_KEY');

  if (!apiKey) {
    const errorMsg = `⚠️ **Clé API manquante** : Vous n'avez pas configuré de clé pour ${isOpenAI ? 'OpenAI' : 'Google Gemini'}. \n\nVeuillez vous rendre dans les **Paramètres** (icône roue dentée dans la barre latérale) pour l'ajouter.`;
    onChunk(errorMsg);
    return errorMsg;
  }

  // Préparation du contexte du sujet
  const topicContext = topic 
    ? `Le contexte de la discussion est : "${topic}".` 
    : "Le sujet est libre, sois un partenaire d'échange amical.";

  // Nettoyage de l'historique pour le prompt
  const recentHistory = history.filter(m => m.content.trim() !== "");
  const historyText = recentHistory.length > 0 
    ? recentHistory.map(m => `${m.role === 'user' ? 'Apprenant' : 'IA'} : ${m.content}`).join('\n')
    : "(C'est le début de la conversation, aucun message n'a encore été échangé)";

  // Séparer targetMessage en deux chaînes de caractères : la composante avec les caractères chinois, et la composante avec le français (si elle existe)
  const frenchMatches = targetMessage.match(/[a-zA-ZÀ-ÿ]{2,}/g);
  const frenchPart = frenchMatches ? frenchMatches.join(' ') : "";
  const chinesePart = targetMessage.replace(/[a-zA-ZÀ-ÿ]/g, '').trim();
  const intentInstruction = frenchPart 
    ? `L'apprenant a précisé ce qu'il voulait dire en français : "${frenchPart}".` 
    : "";

  const prompts: Record<ActionType, string> = {
    content: `Incarne le personnage de cette situation : "${topicContext}". 
- Agis comme un humain avec des émotions， mais reste amical.
- Utilise un langage parlé naturel. Tu peux utiliser des expressions familières ou du jargon si c'est approprié.
- Style WeChat : messages courts, 1-2 phrases.
- Uniquement du texte en chinois, pas de pinyin, pas de français.
- Historique : ${historyText}
- Dernier message : "${targetMessage}"

Réponds directement au message :`,

    regenerate: `Incarne le personnage de cette situation : "${topicContext}". 
- Agis comme un humain avec des émotions， mais reste amical.
- Utilise un langage parlé naturel. Tu peux utiliser des expressions familières ou du jargon si c'est approprié.
- Style WeChat : messages courts, 1-2 phrases.
- Uniquement du texte en chinois, pas de pinyin, pas de français.
- Historique : ${historyText}
- Dernier message : "${targetMessage}"

Réponds directement au message :`,

    correction: `Tu es un professeur de chinois mandarin expert. ${topicContext}
Voici le contexte de la conversation : ${historyText}.
Voici le message de l'apprenant : "${chinesePart}". ${intentInstruction}
Consignes de réponse :
- Renvoie uniquement ce qui est demandé, sans introduction ni conclusion, de façon concise. Pas besoin de sur-corriger ou de sur-expliquer.
- Les corrections que tu proposes doivent essayer de garder exactement la sémantique que voulait transmettre l'apprenant, même si elle est un peu bancale, sans ajouter d'éléments qui n'étaient pas dans le message original. Même si c'est difficilement compréhensible, fais l'effort de comprendre ce que l'apprenant voulait dire et de ne rien retirer.
- Tu dois t'adresser directement à l'apprenant en utilisant "Tu" pour rendre la correction plus personnelle et engageante.
- Réponds seulement avec la forme suivante : 
1. S'il y a des erreurs ou des problèmes de formulation, tout en restant bienveillant, indique-les pour que l'apprenant puisse ne pas les reproduire à l'avenir. S'il n'y a pas d'erreur, pas besoin.
2. Propose ensuite une ou plusieurs versions corrigée(s) du message. Les différentes versions peuvent correspondre à différents niveaux de langue, différents tons, différentes formulations, etc. Tu peux présenter ces phrases dans un tableau en précisant les Hanzi, le Pinyin, la traduction française, et une explication de pourquoi avoir choisi cette formulation.`,

    explanation: `Tu es un professeur de chinois mandarin expert. ${topicContext}
Voici le contexte de la conversation : ${historyText}.
L'IA a envoyé ce message : "${targetMessage}".
Explique-le de façon concise à l'apprenant francophone.
- Tu ne dois rien renvoyer d'autre que l'explication, pas de phrases d'introduction, ni de conclusion, sois très concis. Pas besoin de sur-expliquer.
1. Pinyin et traduction globale en français (utilise un ton naturel ou argotique si le message original l'est).
2. Vocabulaire clé : Un tableau avec les colonnes Hanzi, Pinyin, Sens.
3. Grammaire : Si un point de grammaire oral ou un jargon est intéressant, explique-le brièvement. Sinon, ne mets rien.`,

    examples: `Tu es un professeur de chinois. ${topicContext}
Voici le contexte de la conversation : ${historyText}.
Voici le dernier message reçu : "${targetMessage}".
- Tu ne dois rien renvoyer d'autre que les exemples, pas de phrases d'introduction, ni de conclusion, sois très concis. Pas besoin de sur-expliquer.
- Propose plusieurs réponses possibles à ce message qui soient naturelles et adaptées au contexte. 
- Pour chaque exemple : Hanzi, Pinyin et Traduction française.
- Sois très concis.`
  };

  const prompt = prompts[type];

  if (isOpenAI) {
    // LOGIQUE OPENAI
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const stream = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: "Tu es un assistant expert en langue chinoise." },
        { role: "user", content: prompt }
      ],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullText += content;
      onChunk(fullText);
    }
    return fullText;

  } else {
    // LOGIQUE GEMINI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContentStream(prompt);

    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk(fullText);
    }
    return fullText;
  }
}