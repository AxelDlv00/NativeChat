import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  
  const { data, error } = await supabase
    .from('Message')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  // Récupérer le message pour connaître le chatId et la date
  const { data: msg } = await supabase.from('Message').select('*').eq('id', id).single();
  if (!msg) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

  let query = supabase.from('Message').delete().eq('chatId', msg.chatId);

  if (mode === 'only-after') {
    query = query.gt('createdAt', msg.createdAt);
  } else {
    query = query.gte('createdAt', msg.createdAt);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}