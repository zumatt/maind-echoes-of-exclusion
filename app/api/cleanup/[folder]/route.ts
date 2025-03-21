// app/api/blob/cleanup/route.ts
import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export async function DELETE(request: Request, context: any) {
  const { params } = context;
  const { folder } = params;

  if (!folder) {
    return NextResponse.json({ error: 'Missing folder' }, { status: 400 });
  }

  try {
    const blobs = await list();
    blobs.blobs.filter(blob => blob.pathname.split('/')[1] === folder).forEach(blob => del(blob.url));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Blob cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
