import { readFile } from "fs/promises";
import path from "path";

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const dataFile = path.join(process.cwd(), "data", "submissions.json");
    const fileData = await readFile(dataFile, "utf8");
    const submissions = JSON.parse(fileData);

    // Search by TOKEN, not ID
    const customer = submissions.find((entry) => entry.token === id);
    console.log("Looking for token:", id);
    console.log(
      "Available tokens:",
      submissions.map((s) => s.token)
    );

    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    let expiryDate = null;
    if (customer.expiryDays) {
      const createdAt = new Date(customer.createdAt);
      createdAt.setDate(createdAt.getDate() + parseInt(customer.expiryDays));
      expiryDate = createdAt.toISOString();
    }

    return Response.json({
      ...customer,
      expiryDate,
    });
  } catch (err) {
    console.error("Error reading customer data:", err);
    return Response.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
