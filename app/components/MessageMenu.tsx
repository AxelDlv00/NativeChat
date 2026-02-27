'use client';
import { pinyin } from 'pinyin-pro';

interface MessageMenuProps {
  content: string;
  onAction: (type: 'pinyin' | 'translate') => void;
}

export default function MessageMenu({ content, onAction }: MessageMenuProps) {
  return (
    <div className="flex gap-2 p-1 bg-[#2d2f31] border border-gray-800 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 ring-1 ring-white/5">
      <button 
        onClick={() => onAction('pinyin')}
        className="px-2 py-1 text-[10px] font-bold hover:bg-white/10 rounded text-amber-400 transition-colors uppercase tracking-wider"
      >
        拼 Pinyin
      </button>
      
      {/* Séparateur discret */}
      <div className="w-[1px] bg-white/10 my-1" />

      <button 
        onClick={() => onAction('translate')}
        className="px-2 py-1 text-[10px] font-bold hover:bg-white/10 rounded text-brand transition-colors uppercase tracking-wider"
      >
        文 Traduire
      </button>
    </div>
  );
}