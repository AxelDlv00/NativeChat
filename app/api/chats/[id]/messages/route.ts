import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { role, content } = await req.json();
    
    const { data, error } = await supabase
      .from('Message')
      .insert([{
        role,
        content,
        chatId: id,
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erreur message Supabase:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}