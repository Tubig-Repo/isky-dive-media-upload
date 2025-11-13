// app/api/customer/[id]/route.js
import { readFile } from "fs/promises";
import path from "path";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Read submissions data
    const dataFile = path.join(process.cwd(), "data", "submissions.json");
    let submissions = [];

    try {
      const raw = await readFile(dataFile, "utf8");
      submissions = JSON.parse(raw);
    } catch (err) {
      return Response.json(
        { error: "No customer data found" },
        { status: 404 }
      );
    }

    // Find customer by token
    const customer = submissions.find((sub) => sub.token === id);
    console.log(customer);

    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check if link has expired
    if (customer.expiresAt) {
      const expiryDate = new Date(customer.expiresAt);
      const now = new Date();

      if (now > expiryDate) {
        return Response.json(
          {
            error: "This link has expired",
            expiredAt: customer.expiresAt,
          },
          { status: 410 }
        );
      }
    }

    // Prepare response data based on payment status
    const responseData = {
      customerName: customer.customerName,
      customMessage: customer.customMessage,
      isPaid: customer.isPaid,
      photos: customer.photos || [],
      videos: [],
      paymentLink: customer.paymentLink,
      createdAt: customer.createdAt,
      expiresAt: customer.expiresAt,
    };

    // ========================================
    // VIDEO ACCESS LOGIC
    // ========================================
    if (customer.isPaid) {
      // PAID: Return all original videos (unlocked)
      responseData.videos = customer.videos.map((video) => ({
        id: video.id,
        filename: video.filename,
        url: video.originalUrl, // Original, unwatermarked
        isLocked: false,
        isFreePreview: video.isFreePreview,
        size: video.size,
      }));
    } else {
      // UNPAID: Only return watermarked preview, lock others
      responseData.videos = customer.videos.map((video) => ({
        id: video.id,
        filename: video.filename,
        url: video.isFreePreview ? video.watermarkedUrl : null, // Only free preview visible
        isLocked: !video.isFreePreview,
        isFreePreview: video.isFreePreview,
        thumbnailUrl: video.thumbnailUrl,
        originalUrl: video.originalUrl,
        size: video.size,
      }));
    }

    console.log(
      `✓ Customer ${customer.customerName} accessed page (Paid: ${customer.isPaid})`
    );

    return Response.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Get customer data failed:", error);
    return Response.json(
      {
        error: "Failed to retrieve customer data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
