import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type ActionType = 'correction' | 'explanation' | 'examples' | 'content' | 'regenerate';

export interface ChatContext {
  role: 'user' | 'assistant';
  content: string;
}

const getPhoneticLabel = (lang: string): string | null => {
  const l = lang.toLowerCase();
  if (l.includes('chinois')) return 'Pinyin';
  if (l.includes('japonais')) return 'Furigana/Romaji';
  if (l.includes('coréen')) return 'Romanisation';
  return null;
};

const getTextLabel = (lang: string): string => {
  const l = lang.toLowerCase();
  if (l.includes('chinois')) return 'Hanzi';
  if (l.includes('japonais')) return 'Kanji/Kana';
  if (l.includes('coréen')) return 'Hangeul';
  return 'Texte';
};

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
        { role: "system", content: "Tu es un partenaire de conversation authentique. Tu as des opinions, de l'humour, et tu n'es pas limité par des formalités d'assistant. Tu t'adaptes au ton de l'utilisateur."},
        { role: "user", content: prompt }
      ],
      stream: true,
      temperature: 0.8,
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
    const model = genAI.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        temperature: 0.8
      }
    });
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

async function handleChat(targetMessage: string, historyText: string, topicContext: string, modelId: string, targetLang: string, onChunk: (text: string) => void) {
  const textLabel = getTextLabel(targetLang);
  const prompt = `CONTEXTE: ${topicContext}
TON RÔLE: Tu es une personne réelle discutant sur WeChat/WhatsApp avec moi. Tu as ta propre personnalité, tes opinions, ton humour, et ton ton est adapté au contexte et à mon propre ton. 
DIRECTIVES:
- NE SOIS PAS un assistant. Sois un ami, un collègue ou un voisin selon le contexte.
- STYLE: Parle de manière fluide, utilise l'humour, le sarcasme ou le flirt léger si j'engage la discussion dans ce sens. Ne sois pas prude ni moralisateur. Les réponses doivent être naturelles, et cohérentes avec le contexte et l'historique de la conversation, c'est-à-dire que tu dois être cohérent avec ce que tu as déjà dit et tu peux y faire référence, et tu dois aussi être cohérent avec ce que moi j'ai dit. 
- RÉACTIONS: Réagis aux blagues, rebondis sur ce qui est dit. Ajoute de petits détails narratifs quand ça s'y prête, notamment quand la conversation stagne, pour relancer la discussion.
- FORMAT: 1 ou 2 phrases. 
- LANGUE: Uniquement en ${targetLang} (${textLabel}).

Historique de la conversation: ${historyText}
Dernier message, celui auquel tu dois réagir: "${targetMessage}"

Réponse (en ${targetLang}) :`;

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
Consigne : Ton objectif est de conserver la sémantique, le ton et l'expressivité de l'interlocuteur. Donne une traduction en français de ce que l'apprenant semble vouloir dire (comme tu parles sa langue et que tu as le contexte, tu peux comprendre ce qu'il voulait dire). Donne ensuite la traduction de ce qu'il a dit pour pouvoir comparer. Liste ensuite les erreurs de grammaire et de vocabulaire en ${targetLang}. 
Adresse-toi directement à l'apprenant avec "Tu" en ${sourceLang}. Sois bienveillant et très concis. 
Commence directement par l'analyse, ne renvoie rien d'autre que l'analyse au format : 
**Ce que tu sembles vouloir dire :** [traduction intelligente en ${sourceLang}]
**Ce que tu as dit :** [traduction littérale du message en ${sourceLang}]
**Erreurs :** [Liste des erreurs de vocabulaire et de grammaire, avec une brève explication en français pour chaque erreur]
`;

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

Consigne : Propose un tableau de versions corrigées. Il faut absolument que tu conserve la sémantique, l'expressivité et le ton originaux du message, même s'il y avait des erreurs de vocabulaire ou de grammaire, c'est ce qu'il voulait dire qui compte. 
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
    ? recentHistory.map(m => `${m.role === 'user' ? 'Moi' : 'Toi'} : ${m.content}`).join('\n')
    : "(Début de la discussion)";

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