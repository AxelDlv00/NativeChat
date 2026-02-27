'use client';

import { useState, ReactNode } from 'react';
import { Message } from '../types';
import { ActionType } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { pinyin } from 'pinyin-pro';
import MessageMenu from './MessageMenu';

interface MessageItemProps {
  message: Message;
  onAction: (id: string, type: ActionType, force?: boolean) => void;
  onDeleteFromHere: (id: string) => void;
  onRegenerate: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}

interface MarkdownComponentProps {
  children?: ReactNode;
}

export default function MessageItem({ 
  message, 
  onAction, 
  onDeleteFromHere, 
  onRegenerate, 
  onUpdate 
}: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [localPinyin, setLocalPinyin] = useState<string | null>(null);
  const [localTranslation, setLocalTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  
  const [hiddenBlocks, setHiddenBlocks] = useState<Record<string, boolean>>({
    correction: true,
    explanation: true,
    examples: true
  });

  const handleToolAction = async (type: 'pinyin' | 'translate') => {
    if (type === 'pinyin') {
      const result = pinyin(message.content, { toneType: 'symbol' });
      setLocalPinyin(localPinyin ? null : result);
    } 
    
    if (type === 'translate') {
      if (localTranslation) {
        setLocalTranslation(null);
      } else {
        setIsTranslating(true);
        try {
          const userApiKey = localStorage.getItem('GEMINI_API_KEY');
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: message.content,
              apiKey: userApiKey 
            })
          });
          const data = await res.json();
          setLocalTranslation(data.translation);
        } catch (e) {
          console.error("Erreur traduction:", e);
        } finally {
          setIsTranslating(false);
        }
      }
    }
    setShowMenu(false);
  };

  const markdownComponents = {
    p: ({ children }: MarkdownComponentProps) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }: MarkdownComponentProps) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: MarkdownComponentProps) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
    li: ({ children }: MarkdownComponentProps) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: MarkdownComponentProps) => <strong className="font-bold text-white">{children}</strong>,
    em: ({ children }: MarkdownComponentProps) => <em className="italic text-gray-300">{children}</em>,
    code: ({ children }: MarkdownComponentProps) => (
      <code className="bg-brand/10 px-1 rounded text-brand font-mono text-[0.9em]">
        {children}
      </code>
    ),
    table: ({ children }: MarkdownComponentProps) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-gray-700">
        <table className="w-full text-left border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: MarkdownComponentProps) => <thead className="bg-[#2d2f31] text-xs uppercase text-gray-400">{children}</thead>,
    th: ({ children }: MarkdownComponentProps) => <th className="px-4 py-2 border-b border-gray-700 font-bold">{children}</th>,
    td: ({ children }: MarkdownComponentProps) => <td className="px-4 py-2 border-b border-gray-800 text-sm">{children}</td>,
    tr: ({ children }: MarkdownComponentProps) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
  };

  // Couleurs harmonisées : Correction (Emerald), Explication (Brand), Exemples (Purple)
  const displayConfigs = [
    { key: 'correction', label: 'Correction', loading: message.isCorrecting, color: 'text-emerald-400', border: 'hover:border-emerald-900/50' },
    { key: 'explanation', label: 'Explication', loading: message.isExplaining, color: 'text-brand', border: 'hover:border-brand/50' },
    { key: 'examples', label: 'Exemples', loading: message.isGeneratingExamples, color: 'text-purple-400', border: 'hover:border-purple-900/50' },
  ] as const;

  const actionStyles = {
    correction: { active: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_-3px_rgba(16,185,129,0.2)]', hover: 'hover:border-emerald-500/60 hover:text-emerald-300' },
    explanation: { active: 'bg-brand/10 border-brand/40 text-brand shadow-[0_0_12px_-3px_rgba(37,150,190,0.2)]', hover: 'hover:border-brand/60 hover:text-brand' },
    examples: { active: 'bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_0_12px_-3px_rgba(168,85,247,0.2)]', hover: 'hover:border-purple-500/60 hover:text-purple-300' },
  };

  const handleToggleOrGenerate = (type: ActionType) => {
    const hasContent = !!message[type as keyof Message];
    if (hiddenBlocks[type]) {
      setHiddenBlocks(prev => ({ ...prev, [type]: false }));
      if (!hasContent) onAction(message.id, type);
    } else {
      setHiddenBlocks(prev => ({ ...prev, [type]: true }));
    }
  };

  return (
    <div className={`group mb-6 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {showMenu && (
        <div className={`mb-2 animate-in fade-in zoom-in duration-200 ${isUser ? 'mr-2' : 'ml-11'}`}>
          <MessageMenu content={message.content} onAction={handleToolAction} />
        </div>
      )}

      <div className="relative max-w-[85%] flex items-start gap-3">
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-brand flex-shrink-0 flex items-center justify-center text-[10px] mt-1 shadow-lg font-bold text-white">
            AI
          </div>
        )}

        <div 
          onClick={() => !isEditing && setShowMenu(!showMenu)}
          className={`rounded-2xl px-4 py-3 relative transition-all duration-200 cursor-pointer ${
          isUser 
            ? 'bg-[#2f2f2f] text-white rounded-tr-none hover:bg-[#383838]' 
            : 'bg-[#1e1f20] border border-gray-800 text-gray-200 rounded-tl-none hover:border-gray-600'
        }`}>
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[250px]" onClick={(e) => e.stopPropagation()}>
              <textarea 
                autoFocus
                className="bg-[#131314] border border-brand rounded p-2 text-sm outline-none w-full resize-none text-white"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-400 hover:text-white">Annuler</button>
                <button onClick={() => { onUpdate(message.id, editValue); setIsEditing(false); }} className="text-xs text-brand font-bold hover:opacity-80">Enregistrer</button>
              </div>
            </div>
          ) : (
            <div className="text-sm md:text-base leading-relaxed break-words overflow-hidden">
              {localPinyin && (
                <div className="text-[11px] text-amber-400/90 font-mono mb-1.5 leading-tight border-b border-amber-400/10 pb-1 italic tracking-wide">
                  {localPinyin}
                </div>
              )}
              
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>

              {(isTranslating || localTranslation) && (
                <div className="mt-2 pt-2 border-t border-white/5 text-sm italic text-gray-400 animate-in slide-in-from-top-1 duration-300">
                  {isTranslating ? (
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-brand rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-brand rounded-full animate-bounce [animation-delay:0.2s]" />
                    </span>
                  ) : localTranslation}
                </div>
              )}
            </div>
          )}

          <div className={`absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
            isUser ? '-left-18 justify-end' : '-right-18 justify-start'
          } w-16`}>
            {isUser ? (
              <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onRegenerate(message.id); }} className="p-1.5 text-gray-500 hover:text-brand transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDeleteFromHere(message.id); }} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>

      <div className={`flex gap-2 mt-2.5 ${isUser ? 'mr-2 justify-end' : 'ml-11 justify-start'}`}>
        {isUser ? (
          <>
            <ActionButton label="Corriger" active={!hiddenBlocks['correction']} activeClass={actionStyles.correction.active} hoverClass={actionStyles.correction.hover} loading={message.isCorrecting} onClick={() => handleToggleOrGenerate('correction')} />
            <ActionButton label="Expliquer" active={!hiddenBlocks['explanation']} activeClass={actionStyles.explanation.active} hoverClass={actionStyles.explanation.hover} loading={message.isExplaining} onClick={() => handleToggleOrGenerate('explanation')} />
          </>
        ) : (
          <>
            <ActionButton label="Expliquer" active={!hiddenBlocks['explanation']} activeClass={actionStyles.explanation.active} hoverClass={actionStyles.explanation.hover} loading={message.isExplaining} onClick={() => handleToggleOrGenerate('explanation')} />
            <ActionButton label="Exemples" active={!hiddenBlocks['examples']} activeClass={actionStyles.examples.active} hoverClass={actionStyles.examples.hover} loading={message.isGeneratingExamples} onClick={() => handleToggleOrGenerate('examples')} />
          </>
        )}
      </div>

      <div className={`mt-3 w-full max-w-[80%] space-y-2 ${isUser ? 'mr-0' : 'ml-11'}`}>
        {displayConfigs.map((config) => {
          const value = message[config.key as keyof Message];
          if (hiddenBlocks[config.key] || (!value && !config.loading)) return null;

          return (
            <div key={config.key} className={`bg-[#1a1b1c] border border-gray-800 rounded-xl p-3 relative group/res transition-all ${config.border}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
                <button onClick={() => onAction(message.id, config.key as ActionType, true)} className="opacity-0 group-hover/res:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
              </div>
              {config.loading && !value ? (
                <div className="space-y-2 mt-2">
                  <div className="h-2 bg-gray-800 animate-pulse rounded w-full" />
                  <div className="h-2 bg-gray-800 animate-pulse rounded w-2/3" />
                </div>
              ) : (
                <div className="text-sm text-gray-300 leading-relaxed break-words overflow-hidden">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {`${value as string}${config.loading ? ' ▎' : ''}`}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  active: boolean;
  loading?: boolean;
  onClick: () => void;
  activeClass: string;
  hoverClass: string;
}

function ActionButton({ label, active, loading, onClick, activeClass, hoverClass }: ActionButtonProps) {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      disabled={loading}
      className={`text-[10px] px-3 py-1.5 rounded-full border transition-all duration-200 font-semibold tracking-wide ${
        active ? activeClass : `border-gray-800 text-gray-500 bg-transparent ${hoverClass}`
      } ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      {loading ? (
        <span className="flex items-center gap-1 px-2">
          <span className="w-1 h-1 bg-current rounded-full animate-bounce" />
          <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
          <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
        </span>
      ) : label}
    </button>
  );
}