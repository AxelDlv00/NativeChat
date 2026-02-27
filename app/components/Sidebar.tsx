'use client';
import { useState, useEffect } from 'react';
import { Chat } from '../types';
import Image from 'next/image';
import { UserButton, useUser } from '@clerk/nextjs';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void; 
}

export default function Sidebar({ 
  chats, 
  activeChatId, 
  isOpen, 
  onToggle, 
  onSelectChat, 
  onNewChat, 
  onRenameChat,
  onDeleteChat,
  onOpenSettings
}: SidebarProps) {
  const { user } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // État pour le modèle sélectionné (par défaut Gemini 2.0 Flash Lite)
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-lite');

  // Charger le modèle sauvegardé au montage du composant
  useEffect(() => {
    const savedModel = localStorage.getItem('SELECTED_MODEL');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem('SELECTED_MODEL', newModel);
  };

  const getFlag = (lang: string) => {
    const flags: Record<string, string> = {
      'Français': '🇫🇷',
      'Anglais': '🇬🇧',
      'Chinois': '🇨🇳',
      'Japonais': '🇯🇵',
    };
    return flags[lang] || '🌐';
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-[280px] bg-[#1e1f20] text-[#e3e3e3] h-screen flex flex-col transition-all duration-300 ease-in-out z-40 border-r border-white/5">
      
      {/* Header Sidebar */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 px-2">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-md">
            <Image 
              src="/icon.png" 
              alt="NativeChat Logo" 
              fill
              sizes="32px"
              priority
              className="object-cover"
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            NativeChat
          </span>
        </div>

        <button 
          onClick={onToggle}
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          title="Fermer le menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>
      </div>

      <div className="px-3 mb-6">
        <button 
          onClick={onNewChat}
          className="flex items-center gap-3 bg-white/5 hover:bg-brand/10 text-sm text-gray-400 hover:text-brand font-medium py-3 px-4 rounded-full transition-all border border-white/5 hover:border-brand/30 w-full group"
        >
          <span className="text-xl text-brand group-hover:scale-110 transition-transform">+</span>
          <span>Nouveau chat</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
        <p className="text-[11px] text-gray-500 font-semibold px-3 uppercase tracking-[0.1em] mb-4">Récents</p>
        <div className="space-y-1">
          {chats.map((chat, index) => (
            <div key={`${chat.id}-${index}`} className="group relative">
              {editingId === chat.id ? (
                <div className="px-1">
                  <input
                    autoFocus
                    className="w-full bg-[#131314] text-sm py-2 px-3 rounded-lg outline-none ring-1 ring-brand"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => { 
                      if (editTitle.trim()) onRenameChat(chat.id, editTitle); 
                      setEditingId(null); 
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onRenameChat(chat.id, editTitle);
                        setEditingId(null);
                      }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                </div>
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    onDoubleClick={() => { setEditingId(chat.id); setEditTitle(chat.title); }}
                    className={`w-full flex flex-col gap-1 px-3 py-3 rounded-2xl transition-all pr-10 border border-transparent ${
                      activeChatId === chat.id 
                          ? 'bg-brand/10 border-brand/20 text-brand shadow-lg shadow-brand/5'
                          : 'hover:bg-white/5 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${activeChatId === chat.id ? 'opacity-100' : 'opacity-40'}`}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span className={`truncate font-medium ${activeChatId === chat.id ? 'text-brand' : ''}`}>
                        {chat.title || "Nouvelle discussion"}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between ml-5 mt-0.5">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                        activeChatId === chat.id ? 'bg-brand/20 border-brand/20' : 'bg-black/20 border-white/5'
                      }`}>
                        {getFlag(chat.sourceLang)} <span className="opacity-50 mx-0.5">→</span> {getFlag(chat.targetLang)}
                      </div>
                      
                      <span className="text-[9px] opacity-40 font-mono uppercase tracking-tighter">
                        {formatDate(chat.createdAt)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Supprimer cette discussion ?")) onDeleteChat(chat.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Sidebar */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-4">
        
        {/* Sélecteur de Modèle IA */}
        <div className="px-1">
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">
            Modèle choisi :
          </label>
          <div className="relative group/select">
            <select 
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full bg-[#131314] border border-white/5 hover:border-brand/40 text-[11px] text-gray-300 rounded-xl px-3 py-2.5 outline-none cursor-pointer appearance-none transition-all shadow-inner"
            >
              <optgroup label="Google Gemini" className="bg-[#1e1f20]">
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
              </optgroup>
              <optgroup label="OpenAI GPT" className="bg-[#1e1f20]">
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </optgroup>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <button 
            onClick={onOpenSettings}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-brand/10 hover:text-brand rounded-xl transition-all group overflow-hidden border border-transparent hover:border-brand/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:rotate-45 transition-transform duration-300">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span className="truncate font-medium">Paramètres</span>
          </button>

          <div className="flex-shrink-0 hover:scale-110 transition-transform">
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8 border border-white/10 shadow-lg hover:border-brand/50 transition-colors"
                }
              }}
            />
          </div>
        </div>

        <div className="px-2 space-y-2">
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <a href="https://axeldlv00.github.io/axel-delaval-personal-page/" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-500 hover:text-brand transition-colors">
              By Axel Delaval
            </a>
            <a href="https://github.com/AxelDlv00/NativeChat" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}