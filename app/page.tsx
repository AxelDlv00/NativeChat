import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/chat');
  }

  return (
    <div className="min-h-screen bg-[#131314] text-white flex flex-col items-center justify-between p-6">
      <div />

      <div className="max-w-4xl w-full text-center space-y-8 my-20">
        {/* Logo & Badge */}
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-2xl">
            <Image src="/icon.png" alt="NativeChat" fill className="object-cover" />
          </div>
          <span className="px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold uppercase tracking-widest">
            Apprentissage par l'immersion
          </span>
        </div>

        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Maîtrisez le Chinois avec <span className="text-brand">NativeChat</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Simulez des conversations réelles avec l&apos;IA.
            Correction instantanée, explications grammaticales et immersion totale.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center pt-8">
          <Link href="/sign-up" className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5">
            Créer un compte 
          </Link>
          <Link href="/sign-in" className="px-8 py-4 bg-transparent border border-gray-700 text-white rounded-full font-bold text-lg hover:bg-white/5 transition-all">
            Se connecter
          </Link>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          {[
            { title: "Roleplay IA", desc: "Des scénarios de la vie réelle : banque, restaurant, voisin...", icon: "🎭" },
            { title: "Correction Live", desc: "L'IA analyse vos messages et suggère des versions naturelles.", icon: "✍️" },
            { title: "Outils Intégrés", desc: "Pinyin, traduction et explications en un clic.", icon: "📚" }
          ].map((f, i) => (
            <div key={i} className="p-6 bg-[#1e1f20] border border-white/5 rounded-2xl hover:border-brand/40 transition-colors group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-brand transition-colors">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Crédits & Repo */}
      <footer className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4 py-8 border-t border-white/5 text-gray-500">
        <div className="flex items-center gap-4 text-sm">
          <a 
            href="https://axeldlv00.github.io/axel-delaval-personal-page/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            By Axel Delaval
          </a>
          <span className="opacity-20">|</span>
          <span className="font-mono text-[10px] uppercase tracking-tighter">Février 2026</span>
        </div>

        <a 
          href="https://github.com/AxelDlv00/NativeChat" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-brand/10 hover:text-brand text-sm font-medium transition-all group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          GitHub Repository
        </a>
      </footer>
    </div>
  );
}