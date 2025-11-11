// app/api/test-watermark/route.js
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";
import { writeFile, readFile } from "fs/promises";
import crypto from "crypto";

export async function POST(req) {
  const data = await req.formData();
  const file = data.get("file");
  const customerName = data.get("customerName");
  const customerEmail = data.get("customerEmail");
  const isPaid = data.get("isPaid") === "true";
  const expiryDays = data.get("expiryDays");
  const customMessage = data.get("customMessage");

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

  // Optional: final storage location for the processed video
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const finalOutputPath = path.join(
    uploadsDir,
    `watermarked-${videoId}.${fileExtension}`
  );

  // Path to your watermark image
  const watermarkPath = path.join(process.cwd(), "public", "watermark.png");

  try {
    // Check watermark
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

    // Write input file
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    console.log("Starting FFmpeg processing...");

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .input(watermarkPath)
        .complexFilter([
          "[1:v]scale=iw:ih[watermark]",
          "[0:v][watermark]overlay=(W-w)/2:(H-h)/2",
        ])
        .outputOptions(["-c:v libx264", "-preset fast", "-crf 23", "-c:a copy"])
        .output(finalOutputPath) // save directly to /public/uploads
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log("FFmpeg processing completed:", finalOutputPath);

    // ✅ Save submission data locally
    // ✅ Ensure /data folder exists
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dataFile = path.join(dataDir, "submissions.json");
    let existing = [];

    try {
      const raw = await readFile(dataFile, "utf8");
      existing = JSON.parse(raw);
    } catch (err) {
      console.log("Creating new submissions.json...");
    }
    // ✅ Generate a unique customer URL
    const customerToken = crypto.randomBytes(8).toString("hex");
    const customerUrl = `localhost:3000/customer/${customerToken}`;

    const newEntry = {
      id: videoId,
      token: customerToken,
      customerUrl,
      customerName,
      customerEmail,
      isPaid,
      expiryDays,
      customMessage,
      videoPath: `/uploads/watermarked-${videoId}.${fileExtension}`,
      createdAt: new Date().toISOString(),
    };

    existing.push(newEntry);
    await writeFile(dataFile, JSON.stringify(existing, null, 2));

    // ✅ Return the stored info (no need to return file blob anymore)
    return Response.json({
      success: true,
      message: "Video processed and data saved locally",
      data: newEntry,
    });
  } catch (error) {
    console.error("Processing failed:", error);
    return Response.json(
      { error: "Processing failed", details: error.message },
      { status: 500 }
    );
  } finally {
    // Clean temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupErr) {
      console.warn("Temp cleanup failed:", cleanupErr);
    }
  }
}
