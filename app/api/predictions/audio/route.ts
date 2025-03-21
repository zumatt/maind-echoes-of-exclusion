import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  export async function POST(request: Request) {
  const { text, speaker } = await request.json();

  if (!text || !speaker) {
    return NextResponse.json({ error: 'Missing text or speaker' }, { status: 400 });
  }

  const input = {
    text,
    language: 'en',
    speaker,
  };

  const prediction = await replicate.predictions.create({
    version: '684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e',
    input,
  });

  if (prediction?.error) {
    return NextResponse.json({ detail: prediction.error }, { status: 500 });
  }

  return NextResponse.json(prediction, { status: 201 });
}