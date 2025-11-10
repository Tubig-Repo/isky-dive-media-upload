// app/api/upload/route.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  const data = await req.formData();
  const file = data.get("file");

  if (!file) return new Response("No file uploaded", { status: 400 });

  const videoId = nanoid();
  const fileExtension = file.name.split(".").pop();
  const arrayBuffer = await file.arrayBuffer();

  // 1. Upload ORIGINAL to R2
  const originalKey = `originals/${videoId}.${fileExtension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: originalKey,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    })
  );

  // 2. Process with watermark using FFmpeg
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${videoId}-input.${fileExtension}`);
  const outputPath = path.join(tempDir, `${videoId}-output.${fileExtension}`);
  const watermarkPath = path.join(process.cwd(), "public", "watermark.png");

  // Write video to temp file
  fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

  // Apply watermark
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .input(watermarkPath)
      .complexFilter([
        // Scale watermark to desired size (optional - adjust or remove if not needed)
        "[1:v]scale=iw:ih[watermark]",
        // Overlay in center using (W-w)/2 for horizontal and (H-h)/2 for vertical centering
        // W/H = main video dimensions, w/h = watermark dimensions
        "[0:v][watermark]overlay=(W-w)/2:(H-h)/2",
      ])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  // 3. Upload WATERMARKED to R2
  const watermarkedKey = `watermarked/${videoId}.${fileExtension}`;
  const watermarkedBuffer = fs.readFileSync(outputPath);

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: watermarkedKey,
      Body: watermarkedBuffer,
      ContentType: file.type,
    })
  );

  // Cleanup temp files
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  // 4. Generate customer page
  const pageId = nanoid(10);

  // Save to your database (example with Prisma)
  // await prisma.video.create({
  //   data: {
  //     id: videoId,
  //     pageId,
  //     originalKey,
  //     watermarkedKey,
  //     originalFileName: file.name,
  //   }
  // });

  return Response.json({
    message: "Uploaded and processed successfully",
    videoId: videoId,
    pageUrl: `/customer/${pageId}`,
    watermarkedUrl: `${process.env.R2_PUBLIC_URL}/${watermarkedKey}`,
  });
}

// Increase timeout for video processing
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes
};
