import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const folder = 'generated';
    const blobs = await list();
    const entries = blobs.blobs.filter((b) => b.pathname.startsWith(`${folder}/`));

    const grouped: Record<string, typeof entries> = {};
    for (const blob of entries) {
      const [, folderName] = blob.pathname.split('/');
      if (!grouped[folderName]) grouped[folderName] = [];
      grouped[folderName].push(blob);
    }

    const folders = Object.entries(grouped)
      .map(([folder, files]) => {
        const original = files.find((f) => f.pathname.includes('originalImage.webp'));
        const generated = files.find((f) => f.pathname.includes('generated_image.webp'));
        const audio = files.find((f) => f.pathname.includes('generatedAudio.wav'));
        return original && generated && audio
          ? {
              folder,
              originalImage: original.url,
              generatedImage: generated.url,
              audio: audio.url,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => Number(b!.folder) - Number(a!.folder));

    return NextResponse.json(folders);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}
