import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
    const { fileName, content, fileType } = await req.json();

    const blob = await put(fileName, new Blob([content], { type: fileType }), {
        access: "public"
    });

    return NextResponse.json(blob);
}