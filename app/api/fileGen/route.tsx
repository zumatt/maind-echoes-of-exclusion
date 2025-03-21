import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const { fileName, content, fileType } = await req.json();

  try {
    let buffer: Buffer | ArrayBuffer;

    if (fileType === "txt") {
      buffer = Buffer.from(content, 'utf-8');
    } else {
      const response = await fetch(content);
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch remote file" }, { status: 400 });
      }
      buffer = await response.arrayBuffer();
    }

    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: fileType
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("File generation error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}