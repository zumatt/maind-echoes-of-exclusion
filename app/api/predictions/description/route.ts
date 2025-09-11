import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  const { imageUrl } = await request.json();

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  const input = {
    image: imageUrl,
    prompt: 'Describe this image with a short but precise description.',
    max_tokens: 80,
  };

  const prediction = await replicate.predictions.create({
    version: '19be067b589d0c46689ffa7cc3ff321447a441986a7694c01225973c2eafc874',
    input,
  });

  if (prediction?.error) {
    return NextResponse.json({ detail: prediction.error }, { status: 500 });
  }

  return NextResponse.json(prediction, { status: 201 });
}