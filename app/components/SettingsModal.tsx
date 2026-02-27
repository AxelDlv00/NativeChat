// app/components/SettingsModal.tsx
'use client';
import { useState } from 'react';

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [geminiKey, setGeminiKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('GEMINI_API_KEY') || '';
    return '';
  });

  const [openaiKey, setOpenaiKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('OPENAI_API_KEY') || '';
    return '';
  });

  const save = () => {
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('OPENAI_API_KEY', openaiKey);
    onClose();
    window.location.reload(); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e1f20] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl my-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
          Configuration des API
        </h2>
        
        <div className="space-y-8">
          {/* Section Gemini */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Google Gemini</h3>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
              <p className="text-[11px] text-blue-300 leading-relaxed">
                1. Allez sur <a href="https://aistudio.google.com/" target="_blank" className="underline font-bold">Google AI Studio</a>.<br />
                2. Cliquez sur <strong>Get API key</strong> et copiez la clé.
              </p>
            </div>
            <input 
              type="password"
              className="w-full bg-[#131314] border border-gray-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all text-white"
              placeholder="Clé Gemini (AIzaSy...)"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </section>

          {/* Section OpenAI */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">OpenAI (GPT)</h3>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3">
              <p className="text-[11px] text-emerald-300 leading-relaxed">
                1. Allez sur le <a href="https://platform.openai.com/api-keys" target="_blank" className="underline font-bold">Dashboard OpenAI</a>.<br />
                2. Créez une <strong>Secret key</strong> (assurez-vous d'avoir du crédit).
              </p>
            </div>
            <input 
              type="password"
              className="w-full bg-[#131314] border border-gray-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all text-white"
              placeholder="Clé OpenAI (sk-...)"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </section>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Annuler
          </button>
          <button onClick={save} className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-bold transition-all shadow-lg active:scale-95">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}