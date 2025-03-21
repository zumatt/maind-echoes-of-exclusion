import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
  
    if (!id) {
      return NextResponse.json({ error: 'Missing prediction ID' }, { status: 400 });
    }
  
    const prediction = await replicate.predictions.get(id);
  
    if (prediction?.error) {
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }
  
    return NextResponse.json(prediction);
  }