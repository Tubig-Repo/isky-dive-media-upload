// app/api/test-watermark/route.js
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

export async function POST(req) {
  const data = await req.formData();
  const file = data.get("file");
  // Error Handling
  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const videoId = nanoid();
  const fileExtension = file.name.split(".").pop();
  const arrayBuffer = await file.arrayBuffer();

  // Setup temp paths
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${videoId}-input.${fileExtension}`);
  const outputPath = path.join(tempDir, `${videoId}-output.${fileExtension}`);

  // Path to your watermark image (adjust this path!)
  const watermarkPath = path.join(process.cwd(), "public", "watermark.png");

  try {
    // Check if watermark exists
    if (!fs.existsSync(watermarkPath)) {
      return Response.json(
        {
          error: "Watermark not found",
          expectedPath: watermarkPath,
          tip: "Create a watermark.png in your public folder",
        },
        { status: 400 }
      );
    }

    // Write video to temp file
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    console.log("Starting FFmpeg processing...");
    console.log("Input:", inputPath);
    console.log("Watermark:", watermarkPath);
    console.log("Output:", outputPath);

    // Apply watermark with FFmpeg
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
        .outputOptions([
          "-c:v libx264", // Video codec
          "-preset fast", // Encoding speed
          "-crf 23", // Quality (lower = better, 18-28 range)
          "-c:a copy", // Copy audio without re-encoding
        ])
        .output(outputPath)
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on("end", () => {
          console.log("FFmpeg processing completed");
          resolve();
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .run();
    });

    // Read the watermarked video
    const watermarkedBuffer = fs.readFileSync(outputPath);
    const stats = fs.statSync(outputPath);

    // Cleanup temp files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // Return the watermarked video as downloadable file
    return new Response(watermarkedBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="watermarked-${file.name}"`,
        "Content-Length": stats.size.toString(),
      },
    });
  } catch (error) {
    // Cleanup on error
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }

    return Response.json(
      {
        error: "Processing failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "50mb",
  },
  maxDuration: 300, // 5 minutes
};
