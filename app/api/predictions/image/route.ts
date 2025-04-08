import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

export async function POST(request: Request) {
    const { prompt } = await request.json();
  
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
  
    const input = {
      prompt,
      go_fast: true,
      guidance: 3.5,
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'webp',
      output_quality: 80,
      prompt_strength: 0.8,
      num_inference_steps: 40,
    };
  
    const prediction = await replicate.predictions.create({
      model: 'black-forest-labs/flux-dev',
      input,
    });
  
    if (prediction?.error) {
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }
  
    return NextResponse.json(prediction, { status: 201 });
  }