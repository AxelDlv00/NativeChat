import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  const { data, error } = await supabase
    .from('Chat')
    .select('*, messages:Message(*)')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Non autorisé", { status: 401 });

  const { topic, sourceLang, targetLang, title } = await req.json();
  
  // 1. Créer le chat
  const { data: chat, error: chatError } = await supabase
    .from('Chat')
    .insert([{ 
      userId: userId, // Clerk ID
      title: title || topic || "Discussion libre", 
      topic, 
      sourceLang: sourceLang || "Français", 
      targetLang: targetLang || "Chinois" 
    }])
    .select()
    .single();

  if (chatError) {
    console.error("Erreur insertion Chat:", chatError);
    return NextResponse.json({ error: chatError.message }, { status: 500 });
  }

  // 2. Créer le premier message
  const { data: messageData, error: msgError } = await supabase
    .from('Message')
    .insert([{ 
      role: 'assistant', 
      content: '', 
      chatId: chat.id // Vérifie que c'est bien un UUID côté Supabase
    }])
    .select();

  if (msgError) {
    console.error("Erreur insertion Message:", msgError);
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    ...chat, 
    messages: messageData 
  });
}