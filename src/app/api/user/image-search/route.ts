import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q.trim())}&per_page=12&orientation=landscape`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Search failed' }, { status: 502 });
    }

    const data = await res.json();
    const results = (data.results || []).map((photo: any) => ({
      id: photo.id,
      url: photo.urls?.regular || photo.urls?.small || '',
      thumb: photo.urls?.thumb || photo.urls?.small || '',
      alt: photo.alt_description || photo.description || q,
    }));

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
