'use client';
import { useState, useRef, useEffect } from 'react';

export default function NewChatModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (data: { topic: string, sourceLang: string, targetLang: string }) => void 
}) {
  const [topic, setTopic] = useState('');
  const [sourceLang, setSourceLang] = useState('Français');
  const [targetLang, setTargetLang] = useState('Chinois');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize du textarea avec une limite de hauteur
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // On fixe une hauteur de base plus grande (ex: 120px)
      // et on laisse grandir jusqu'à un max via le scroll
      const newHeight = Math.max(120, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [topic]);

  const callBrainstorm = async (action: 'random' | 'improve') => {
    setIsLoading(true);
    try {
      const apiKey = localStorage.getItem('GEMINI_API_KEY');
      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, currentTopic: topic, apiKey })
      });
      const data = await res.json();
      if (data.result) setTopic(data.result);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-[#1e1f20] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-white font-geist">Nouvelle Discussion</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Sujet de la conversation</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => callBrainstorm('random')}
                  className="text-[10px] text-blue-400 hover:text-white transition-colors"
                >
                  🎲 Aléatoire
                </button>
                {topic.length > 3 && (
                  <button 
                    onClick={() => callBrainstorm('improve')}
                    className="text-[10px] text-emerald-400 hover:text-white transition-colors"
                  >
                    ✨ Améliorer
                  </button>
                )}
              </div>
            </div>
            
            {/* Champ sujet plus haut avec scroll si nécessaire */}
            <div className="relative group">
              <textarea 
                ref={textareaRef}
                rows={4}
                className="w-full bg-[#131314] border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-all min-h-[120px] max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800"
                placeholder="Décris la situation (ex: Je suis à la banque et je veux ouvrir un compte)..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Langue source</label>
              <select className="w-full bg-[#131314] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                <option value="Français">Français</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Langue cible</label>
              <select className="w-full bg-[#131314] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                <option value="Chinois">Chinois</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
          <button 
            disabled={!topic || isLoading}
            onClick={() => onConfirm({ topic, sourceLang, targetLang })}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-900/20"
          >
            {isLoading ? 'IA réfléchit...' : 'Commencer'}
          </button>
        </div>
      </div>
    </div>
  );
}