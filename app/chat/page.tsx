'use client';

import { useState, useRef, useEffect } from 'react'; 
import Sidebar from '../components/Sidebar';
import MessageItem from '../components/MessageItem';
import { Chat, Message } from '../types';
import { generateAIStreamingContent, ActionType } from '@/lib/ai'; 
import SettingsModal from '../components/SettingsModal';
import Image from 'next/image';
import NewChatModal from '../components/NewChatModal'; 

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId) || { 
    id: '', 
    title: '', 
    messages: [],
    topic: '',
    sourceLang: '',
    targetLang: ''
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/chats');
        const data = await res.json();
        if (data?.length > 0) {
          setChats(data);
          setActiveChatId(data[0].id);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages]);

  const handleConfirmNewChat = async (data: { topic: string, sourceLang: string, targetLang: string }) => {
    setIsNewChatModalOpen(false);
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    
    try {
      const titleRes = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'title', currentTopic: data.topic, apiKey })
      });
      const titleData = await titleRes.json();
      const autoTitle: string = titleData.result || data.topic;

      const r = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: data.topic, 
          sourceLang: data.sourceLang, 
          targetLang: data.targetLang, 
          title: autoTitle 
        })
      });
      const newChat = await r.json(); 

      setChats([newChat, ...chats]); 
      setActiveChatId(newChat.id);

      const introMsg = newChat.messages && newChat.messages[0];
      if (introMsg) {
        handleAIRequest(
          introMsg.id, 
          'content', 
          false, 
          "START_CONVERSATION", 
          data.topic,
          [introMsg]
        );
      }
    } catch (e) { 
      console.error("Erreur lors de la création du chat:", e); 
    }
  };

  const updateLocalUI = (messageId: string, fields: Partial<Message>) => {
    setChats(prev => prev.map(chat => ({
      ...chat,
      messages: chat.messages.map(m => m.id === messageId ? { ...m, ...fields } : m)
    })));
  };

  const handleAIRequest = async (
    messageId: string, 
    type: ActionType, 
    force = false, 
    manualContent?: string,
    topicOverride?: string,
    messagesOverride?: Message[]
  ) => {
    const allMessages = messagesOverride || activeChat.messages;
    const msgIndex = allMessages.findIndex(m => m.id === messageId);
    
    if (msgIndex === -1 && !manualContent) return;

    let contentToProcess = manualContent || allMessages[msgIndex]?.content || "";

    if ((type === 'content' || type === 'regenerate') && !manualContent) {
        if (msgIndex > 0) {
          contentToProcess = allMessages[msgIndex - 1].content;
        } else {
          contentToProcess = topicOverride || activeChat.topic || "";
        }
    }

    const historyContext = allMessages
      .slice(0, msgIndex) 
      .filter(m => m.content.trim() !== "")
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const isNewContent = type === 'regenerate' || type === 'content';
    const targetField = isNewContent ? 'content' : (type as keyof Message);
    
    const loadingKeys: Record<string, keyof Message> = {
      correction: 'isCorrecting',
      explanation: 'isExplaining',
      examples: 'isGeneratingExamples'
    };
    const loadKey = loadingKeys[type];

    updateLocalUI(messageId, { [targetField]: "", ...(loadKey ? { [loadKey]: true } : {}) });

    try {
      const finalResult = await generateAIStreamingContent(
        type, 
        contentToProcess, 
        historyContext,
        (accumulatedText) => {
          setChats(prev => prev.map(chat => ({
            ...chat,
            messages: chat.messages.map(m => m.id === messageId ? { ...m, [targetField]: accumulatedText } : m)
          })));
        },
        topicOverride || activeChat.topic
      );

      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [targetField]: finalResult })
      });

      if (loadKey) updateLocalUI(messageId, { [loadKey]: false });
    } catch (e) {
      console.error("Stream error:", e);
      if (loadKey) updateLocalUI(messageId, { [loadKey]: false });
    }
  };

  const handleRegenerate = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}?mode=only-after`, { method: 'DELETE' });
      const res = await fetch('/api/chats');
      setChats(await res.json());
      handleAIRequest(messageId, 'regenerate', true);
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChatId) return;
    const userContent = input;
    setInput('');
    
    try {
      const resUser = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: userContent }),
      });
      const savedUser = await resUser.json();

      const resAi = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: '' }),
      });
      const savedAi = await resAi.json();

      const updatedMessages = [...activeChat.messages, savedUser, savedAi];

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: updatedMessages } : c));
      handleAIRequest(savedAi.id, 'content', false, userContent, undefined, updatedMessages);
      
    } catch (e) { console.error(e); }
  };
  
  const handleUpdateMessage = async (messageId: string, newContent: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newContent }) });
      await fetch(`/api/messages/${messageId}?mode=only-after`, { method: 'DELETE' });
      const res = await fetch('/api/chats');
      setChats(await res.json());
      const resAi = await fetch(`/api/chats/${activeChatId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'assistant', content: '' }) });
      const savedAi = await resAi.json();
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, savedAi] } : c));
      handleAIRequest(savedAi.id, 'content', false, newContent);
    } catch (e) { console.error(e); }
  };

  return (
    <main className="flex h-screen bg-[#131314] overflow-hidden text-gray-200 font-geist">
      <Sidebar 
        isOpen={isSidebarOpen} 
        chats={chats} 
        activeChatId={activeChatId || ''} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        onSelectChat={setActiveChatId} 
        onNewChat={() => setIsNewChatModalOpen(true)}
        onRenameChat={async (id, title) => {
          await fetch(`/api/chats/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
          setChats(chats.map(c => c.id === id ? { ...c, title } : c));
        }}
        onDeleteChat={async (id) => {
            if (confirm("Supprimer cette discussion ?")) {
              await fetch(`/api/chats/${id}`, { method: 'DELETE' });
              setChats(prev => prev.filter(c => c.id !== id));
              if (activeChatId === id) setActiveChatId(null);
            }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
        onConfirm={handleConfirmNewChat} 
      />

      <section className="flex-1 flex flex-col h-full relative overflow-hidden">
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-[#333537] rounded-lg transition-colors text-gray-400 hover:text-white border border-white/10 bg-[#131314]/50 backdrop-blur-md"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-md">
                <Image src="/icon.png" alt="Logo" fill sizes="32px" priority className="object-cover" />
              </div>
              <span className="font-bold text-lg text-white">NativeChat</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-12 pt-20">
          <div className="max-w-3xl mx-auto pb-32">
            {activeChat?.topic && (
              <div className="mb-12 px-2 py-4 border-b border-white/5 group transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600 group-hover:text-gray-500 transition-colors">
                    Contexte de la session
                  </span>
                  <p className="text-sm text-gray-500 leading-relaxed font-light">
                    {activeChat.topic}
                  </p>
                </div>
              </div>
            )}
            {activeChat?.messages?.map((m) => (
              <MessageItem 
                key={m.id} 
                message={m} 
                onAction={(id, type, force) => handleAIRequest(id, type, force)} 
                onRegenerate={handleRegenerate}
                onUpdate={handleUpdateMessage}
                onDeleteFromHere={async (id) => {
                  await fetch(`/api/messages/${id}`, { method: 'DELETE' });
                  const res = await fetch('/api/chats');
                  setChats(await res.json());
                }} 
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-[#131314]">
          <div className="max-w-3xl mx-auto flex items-end gap-2 bg-[#1e1f20] border border-gray-700 p-3 rounded-3xl shadow-xl focus-within:border-brand/50 transition-colors">
            <textarea
              rows={1}
              className="flex-1 bg-transparent px-2 py-1 outline-none text-gray-200 placeholder-gray-500 resize-none text-base"
              placeholder="Écrire en chinois..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim()} 
              className="p-2 bg-brand text-white rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-600"
            >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </button>
          </div>
        </div>
      </section>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </main>
  );
}