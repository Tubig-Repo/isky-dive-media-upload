// app/api/upload-customer-media/route.js
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";
import { writeFile, readFile } from "fs/promises";
import crypto from "crypto";

export async function POST(req) {
  const data = await req.formData();

  // Extract customer info
  const customerName = data.get("customerName");
  const customerEmail = data.get("customerEmail");
  const isPaid = data.get("isPaid") === "true";
  const expiryDays = data.get("expiryDays");
  const customMessage = data.get("customMessage");
  const paymentLink = data.get("paymentLink");
  const videoCount = parseInt(data.get("videoCount") || "0");

  // Extract photos (multiple)
  const photos = data.getAll("photos");

  // Extract videos (multiple) with metadata
  const videos = data.getAll("videos");
  const videoMetadata = [];
  for (let i = 0; i < videoCount; i++) {
    const metaStr = data.get(`videoMeta_${i}`);
    if (metaStr) {
      videoMetadata.push(JSON.parse(metaStr));
    }
  }

  // Validation
  if (!customerName) {
    return Response.json(
      { error: "Customer name is required" },
      { status: 400 }
    );
  }

  if (photos.length === 0 && videos.length === 0) {
    return Response.json(
      { error: "At least one photo or video is required" },
      { status: 400 }
    );
  }

  // Check exactly one video is marked as free
  const freeVideoIndex = videoMetadata.findIndex((meta) => meta.isFree);
  if (videos.length > 0 && freeVideoIndex === -1) {
    return Response.json(
      { error: "Exactly one video must be marked as free preview" },
      { status: 400 }
    );
  }

  const customerId = nanoid();
  const customerToken = crypto.randomBytes(8).toString("hex");

  // Setup directories
  const uploadsDir = path.join(process.cwd(), "public", "uploads", customerId);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const tempDir = os.tmpdir();
  const watermarkPath = path.join(process.cwd(), "public", "watermark.png");

  try {
    // Check watermark exists
    if (videos.length > 0 && !fs.existsSync(watermarkPath)) {
      return Response.json(
        {
          error: "Watermark not found",
          expectedPath: watermarkPath,
          tip: "Create a watermark.png in your public folder",
        },
        { status: 400 }
      );
    }

    // ========================================
    // PROCESS PHOTOS
    // ========================================
    const processedPhotos = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const photoId = nanoid();
      const ext = photo.name.split(".").pop();
      const photoFileName = `photo-${photoId}.${ext}`;
      const photoPath = path.join(uploadsDir, photoFileName);

      const arrayBuffer = await photo.arrayBuffer();
      fs.writeFileSync(photoPath, Buffer.from(arrayBuffer));

      processedPhotos.push({
        id: photoId,
        filename: photo.name,
        url: `/uploads/${customerId}/${photoFileName}`,
        size: photo.size,
      });
    }

    console.log(`✓ Processed ${processedPhotos.length} photos`);

    // ========================================
    // PROCESS VIDEOS
    // ========================================
    const processedVideos = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const videoId = nanoid();
      const ext = video.name.split(".").pop();
      const isFreePreview = videoMetadata[i]?.isFree || false;

      const arrayBuffer = await video.arrayBuffer();
      const inputPath = path.join(tempDir, `${videoId}-input.${ext}`);
      fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

      let finalVideoPath;
      let watermarkedUrl = null;

      // ========================================
      // APPLY WATERMARK TO FREE PREVIEW VIDEO
      // ========================================
      if (isFreePreview) {
        console.log(`🎬 Processing watermarked preview for video ${i + 1}...`);

        const watermarkedFileName = `video-${videoId}-watermarked.${ext}`;
        const watermarkedPath = path.join(uploadsDir, watermarkedFileName);

        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .input(watermarkPath)
            .complexFilter([
              "[1:v]scale=iw:ih[watermark]",
              "[0:v][watermark]overlay=(W-w)/2:(H-h)/2",
            ])
            .outputOptions([
              "-c:v libx264",
              "-preset fast",
              "-crf 23",
              "-c:a copy",
            ])
            .output(watermarkedPath)
            .on("end", resolve)
            .on("error", reject)
            .run();
        });

        watermarkedUrl = `/uploads/${customerId}/${watermarkedFileName}`;
        console.log(`✓ Watermarked video saved: ${watermarkedUrl}`);
      }

      // ========================================
      // SAVE ORIGINAL VIDEO (for after payment)
      // ========================================
      const originalFileName = `video-${videoId}-original.${ext}`;
      const originalPath = path.join(uploadsDir, originalFileName);
      fs.copyFileSync(inputPath, originalPath);

      finalVideoPath = `/uploads/${customerId}/${originalFileName}`;

      // ========================================
      // GENERATE THUMBNAIL for locked videos
      // ========================================
      let thumbnailUrl = null;

      if (!isFreePreview) {
        console.log(`📸 Generating thumbnail for locked video ${i + 1}...`);

        const thumbnailFileName = `video-${videoId}-thumbnail.jpg`;
        const thumbnailPath = path.join(uploadsDir, thumbnailFileName);

        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .screenshots({
              timestamps: ["00:00:05"], // Take screenshot at 1 second
              filename: thumbnailFileName,
              folder: uploadsDir,
              size: "1280x720",
            })
            .on("end", resolve)
            .on("error", reject);
        });

        thumbnailUrl = `/uploads/${customerId}/${thumbnailFileName}`;
        console.log(`✓ Thumbnail generated: ${thumbnailUrl}`);
      }

      processedVideos.push({
        id: videoId,
        filename: video.name,
        isFreePreview,
        watermarkedUrl, // null if not free preview
        originalUrl: finalVideoPath,
        thumbnailUrl, // null if free preview, has thumbnail if locked
        size: video.size,
      });
      // Cleanup temp input
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      console.log(`✓ Processed video ${i + 1}/${videos.length}`);
    }

    // ========================================
    // SAVE TO DATABASE (JSON file)
    // ========================================
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

    const customerUrl = `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/customer/${customerToken}`;

    const newEntry = {
      id: customerId,
      token: customerToken,
      customerUrl,
      customerName,
      customerEmail,
      isPaid,
      expiryDays: expiryDays ? parseInt(expiryDays) : null,
      customMessage,
      paymentLink,
      photos: processedPhotos,
      videos: processedVideos,
      createdAt: new Date().toISOString(),
      expiresAt: expiryDays
        ? new Date(
            Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000
          ).toISOString()
        : null,
    };

    existing.push(newEntry);
    await writeFile(dataFile, JSON.stringify(existing, null, 2));

    console.log("✅ Customer media uploaded successfully!");

    // ========================================
    // RETURN RESPONSE
    // ========================================
    return Response.json({
      success: true,
      message: "Customer media uploaded and processed",
      data: {
        customerId,
        customerName,
        customerUrl,
        isPaid,
        photoCount: processedPhotos.length,
        videoCount: processedVideos.length,
        watermarkedUrl: processedVideos.find((v) => v.isFreePreview)
          ?.watermarkedUrl,
      },
    });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    return Response.json(
      {
        error: "Upload failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
