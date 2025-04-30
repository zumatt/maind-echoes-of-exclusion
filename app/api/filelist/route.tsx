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

    const folders = await Promise.all(
      Object.entries(grouped)
        .map(async ([folder, files]) => {
          const original = files.find((f) => f.pathname.includes('originalImage.webp'));
          const generated = files.find((f) => f.pathname.includes('generated_image.webp'));
          const audio = files.find((f) => f.pathname.includes('generatedAudio.wav'));
          const descriptionUrl = files.find((f) => f.pathname.includes('description.txt'));
          const description = descriptionUrl ? await saveDescriptionToString(descriptionUrl.url) : '';
          return original && generated && audio && description
            ? {
                folder,
                originalImage: original.url,
                generatedImage: generated.url,
                audio: audio.url,
                description: description
              }
            : null;
        })
    ).then(results => 
      results
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Number(b.folder) - Number(a.folder))
    );

    return NextResponse.json(folders);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

// Assuming the description file is a .txt file
async function saveDescriptionToString(filePath: string): Promise<string> {
  try {
    // Read the file content
    const response = await fetch(filePath);
    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error reading description file:', error);
    throw error;
  }
}