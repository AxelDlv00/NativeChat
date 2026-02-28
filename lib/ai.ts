import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type ActionType = 'correction' | 'explanation' | 'examples' | 'content' | 'regenerate';

export interface ChatContext {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Détermine si la langue nécessite une ligne/colonne phonétique
 */
const getPhoneticLabel = (lang: string): string | null => {
  const l = lang.toLowerCase();
  if (l.includes('chinois')) return 'Pinyin';
  if (l.includes('japonais')) return 'Furigana/Romaji';
  if (l.includes('coréen')) return 'Romanisation';
  return null;
};

/**
 * Retourne le libellé pour la colonne de texte original
 */
const getTextLabel = (lang: string): string => {
  const l = lang.toLowerCase();
  if (l.includes('chinois')) return 'Hanzi';
  if (l.includes('japonais')) return 'Kanji/Kana';
  if (l.includes('coréen')) return 'Hangeul';
  return 'Texte';
};

// --- FONCTION GÉNÉRIQUE POUR APPELER L'IA ---

async function askAI(
  prompt: string, 
  modelId: string, 
  onChunk?: (text: string) => void
): Promise<string> {
  const isOpenAI = modelId.startsWith('gpt');
  const apiKey = isOpenAI 
    ? localStorage.getItem('OPENAI_API_KEY') 
    : localStorage.getItem('GEMINI_API_KEY');

  if (!apiKey) throw new Error("API_KEY_MISSING");

  if (isOpenAI) {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const stream = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: "Tu es un assistant expert en enseignement des langues." },
        { role: "user", content: prompt }
      ],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullText += content;
      onChunk?.(fullText);
    }
    return fullText;
  } else {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContentStream(prompt);

    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk?.(fullText);
    }
    return fullText;
  }
}

// --- FONCTIONS SPÉCIFIQUES ---

async function handleChat(targetMessage: string, historyText: string, topicContext: string, modelId: string, targetLang: string, onChunk: (text: string) => void) {
  const textLabel = getTextLabel(targetLang);
  const prompt = `Incarne le personnage de cette situation : "${topicContext}". 
- Tu parles en ${targetLang}.
- Agis comme un humain avec des émotions, mais reste amical.
- Utilise un langage parlé naturel, des expressions familières ou du jargon si approprié.
- Style WeChat : messages courts, 1-2 phrases.
- Uniquement du texte en ${targetLang} (${textLabel}), pas de traduction.
- Historique : ${historyText}
- Dernier message reçu : "${targetMessage}"

Réponds directement au message :`;
  return askAI(prompt, modelId, onChunk);
}

async function handleCorrection(
  targetMessage: string, 
  historyText: string, 
  topicContext: string, 
  modelId: string, 
  targetLang: string,
  sourceLang: string,
  onChunk: (text: string) => void
) {
  let globalText = "";
  const phonetic = getPhoneticLabel(targetLang);
  const textLabel = getTextLabel(targetLang);

  const step1Prompt = `Tu es un professeur de ${targetLang} expert pour des locuteurs ${sourceLang}. ${topicContext}
L'historique est : ${historyText}. 
Message de l'apprenant : "${targetMessage}".
Consigne : Liste uniquement les erreurs de grammaire, de vocabulaire ou les tournures pas naturelles en ${targetLang}. 
Adresse-toi directement à l'apprenant avec "Tu" en ${sourceLang}. Sois bienveillant et très concis.
Commence directement par l'analyse.`;

  const analysisResult = await askAI(step1Prompt, modelId, (text) => {
    globalText = text;
    onChunk(globalText);
  });
  
  globalText += "\n\n";
  onChunk(globalText);

  const tableHeaders = phonetic 
    ? `${textLabel} | ${phonetic} | Traduction ${sourceLang} | Pourquoi ce choix`
    : `${textLabel} | Traduction ${sourceLang} | Pourquoi ce choix`;

  const step2Prompt = `Professeur de ${targetLang}. 
Historique : ${historyText}.
Message original : "${targetMessage}".
Analyse faite : ${analysisResult}.

Consigne : Propose un tableau de versions corrigées. 
Format : Tableau Markdown avec les colonnes : ${tableHeaders}.
Ne fais aucune introduction.`;

  const finalResult = await askAI(step2Prompt, modelId, (text) => {
    onChunk(globalText + text);
  });

  return globalText + finalResult;
}

async function handleExplanation(
  targetMessage: string, 
  historyText: string, 
  topicContext: string, 
  modelId: string, 
  targetLang: string,
  sourceLang: string,
  onChunk: (text: string) => void
) {
  let globalText = "";
  const phonetic = getPhoneticLabel(targetLang);
  const textLabel = getTextLabel(targetLang);

  const step1Prompt = `Tu es un professeur de ${targetLang} expert pour des locuteurs ${sourceLang}.
Le contexte de la conversation est : ${topicContext}.
Historique de la conversation : ${historyText}.
Message à expliquer : "${targetMessage}".
Consigne : Donne la traduction globale en ${sourceLang}${phonetic ? ` et le ${phonetic}` : ""}.
Format : ${phonetic ? `\n- ${phonetic} : [phonétique]` : ""}
- Traduction : [traduction]
Sois très concis, ne fais pas d'introduction.`;

  const step1Result = await askAI(step1Prompt, modelId, (text) => {
    globalText = `**Traduction ${phonetic ? 'et ' + phonetic : ''} :**\n\n` + text;
    onChunk(globalText);
  });
  
  globalText += "\n\n**Vocabulaire :**\n\n";
  onChunk(globalText);

  const tableHeaders = phonetic 
    ? `${textLabel} | ${phonetic} | Sens (${sourceLang})` 
    : `${textLabel} | Sens (${sourceLang})`;

  const step2Prompt = `Extrais le vocabulaire important de : "${targetMessage}".
Consigne : Tableau Markdown avec les colonnes : ${tableHeaders}.
Commence directement par le tableau.`;

  const step2Result = await askAI(step2Prompt, modelId, (text) => {
    onChunk(globalText + text);
  });

  return globalText + step2Result;
}

async function handleExamples(
  targetMessage: string, 
  historyText: string, 
  topicContext: string, 
  modelId: string, 
  targetLang: string,
  sourceLang: string,
  onChunk: (text: string) => void
) {
  const phonetic = getPhoneticLabel(targetLang);
  const textLabel = getTextLabel(targetLang);

  const format = phonetic 
    ? `${textLabel}, ${phonetic} et Traduction ${sourceLang}`
    : `${textLabel} et Traduction ${sourceLang}`;

  const prompt = `Tu es un professeur de ${targetLang} expert. ${topicContext}
Voici l'historique de la conversation : ${historyText}.
Dernier message reçu : "${targetMessage}".
- Propose plusieurs réponses possibles naturelles en ${targetLang}.
- Pour chaque exemple : ${format}.
- Sois très concis, pas d'introduction.`;
  
  return askAI(prompt, modelId, onChunk);
}

/**
 * POINT D'ENTRÉE PRINCIPAL
 */
export async function generateAIStreamingContent(
  type: ActionType,
  targetMessage: string,
  targetLang: string,
  sourceLang: string,
  history: ChatContext[],
  onChunk: (text: string) => void,
  topic?: string | null
): Promise<string> {
  const modelId = typeof window !== 'undefined' ? localStorage.getItem('SELECTED_MODEL') || 'gemini-2.5-flash-lite' : 'gemini-2.5-flash-lite';
  
  const topicContext = topic ? `Le contexte est : "${topic}".` : "Sujet libre, échange amical.";
  const recentHistory = history.filter(m => m.content.trim() !== "");
  const historyText = recentHistory.length > 0 
    ? recentHistory.map(m => `${m.role === 'user' ? 'Apprenant' : 'IA'} : ${m.content}`).join('\n')
    : "(Début de conversation)";

  try {
    switch (type) {
      case 'content':
      case 'regenerate':
        return await handleChat(targetMessage, historyText, topicContext, modelId, targetLang, onChunk);
      
      case 'correction':
        return await handleCorrection(targetMessage, historyText, topicContext, modelId, targetLang, sourceLang, onChunk);
      
      case 'explanation':
        return await handleExplanation(targetMessage, historyText, topicContext, modelId, targetLang, sourceLang, onChunk);
      
      case 'examples':
        return await handleExamples(targetMessage, historyText, topicContext, modelId, targetLang, sourceLang, onChunk);
      
      default:
        throw new Error("Action non supportée");
    }
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") {
      const isOpenAI = modelId.startsWith('gpt');
      onChunk(`⚠️ **Clé API manquante** pour ${isOpenAI ? 'OpenAI' : 'Gemini'}.`);
      return "";
    }
    console.error("AI Stream Error:", error);
    throw error;
  }
}