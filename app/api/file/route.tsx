import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp"; // Import sharp for image processing

export async function POST(req: Request){
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file.name) {
        return NextResponse.json({ error: "No file provided"}, { status: 400 });
    }

    // Check if the uploaded file is an image
    const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validImageTypes.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    // Convert image to WebP format using sharp
    const buffer = await file.arrayBuffer(); // Convert File to ArrayBuffer
    const webpBuffer = await sharp(Buffer.from(buffer))
        .rotate()
        .webp()
        .toBuffer();

    const newFileName = "originalImage.webp"; // Change the file name to .webp
    const folderName = Date.now().toString();

    const blob = await put(`generated/${folderName}/${newFileName}`, webpBuffer, {
        access: "public"
    });

    return NextResponse.json(blob);
}