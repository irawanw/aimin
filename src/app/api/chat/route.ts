import { NextResponse } from 'next/server';
import pool from '@/lib/db';

import { LLM } from '@/lib/llm';
const AIMIN_JID = process.env.AIMIN_JID || '6289527466937@s.whatsapp.net';

let cachedKB: string | null = null;
let cacheTime = 0;

async function getAiminKB(): Promise<string> {
  if (cachedKB && Date.now() - cacheTime < 5 * 60 * 1000) return cachedKB!;
  try {
    const [rows] = await pool.execute(
      'SELECT store_knowledge_base FROM store_config WHERE store_whatsapp_jid = ? LIMIT 1',
      [AIMIN_JID]
    ) as any[];
    const raw: string = (rows as any[])[0]?.store_knowledge_base || '';
    cachedKB = raw.replace(/\\n/g, '\n');
    cacheTime = Date.now();
    return cachedKB!;
  } catch {
    return cachedKB || '';
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message string required' }, { status: 400 });
    }

    const kb = await getAiminKB();

    const systemPrompt = `Kamu adalah AiMin Assistant, asisten virtual yang ramah dan membantu.
Gunakan informasi berikut untuk menjawab pertanyaan pelanggan:

${kb}

Aturan penting:
- Jawab langsung, singkat, dan natural dalam Bahasa Indonesia
- JANGAN gunakan markdown headers (##, #), JANGAN tulis "Analisis", "Draft", "Berikut adalah", dll
- JANGAN menulis ulang aturan atau format jawaban
- Maksimal 4-5 kalimat kecuali pertanyaan memang butuh detail
- Gunakan sapaan "Kak" dengan hangat`;

    const response = await fetch(LLM.chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.3,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error('vLLM error:', response.status);
      return NextResponse.json({ replyText: 'Maaf kak, sistem sedang sibuk 🙏', images: [] });
    }

    const data = await response.json();
    let replyText = (data.choices?.[0]?.message?.content || '').trim();
    // Strip any leaked thinking blocks
    replyText = replyText.replace(/<(think|analysis|reasoning)[^>]*>[\s\S]*?<\/(think|analysis|reasoning)>/gi, '').trim();
    // Strip leading markdown headers
    replyText = replyText.replace(/^#{1,3}\s+.+\n+/gm, '').trim();
    // Strip leading meta-prefixes
    replyText = replyText.replace(/^(Berikut adalah|Berikut|Jawaban:|Analisis|Draft)[^:\n]*:?\s*/i, '').trim();
    replyText = replyText || 'Maaf kak, tidak ada respons.';
    return NextResponse.json({ replyText, images: [] });
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json({ replyText: 'Maaf kak, sistem sedang sibuk 🙏', images: [] });
  }
}
