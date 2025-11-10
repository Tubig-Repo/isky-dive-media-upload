// app/api/customer/[id]/route.js
import fs from "fs";
import path from "path";

export async function GET(req, { params }) {
  const { id } = params;

  try {
    const customerFilePath = path.join(process.cwd(), "data", `${id}.json`);

    if (!fs.existsSync(customerFilePath)) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    const customerData = JSON.parse(fs.readFileSync(customerFilePath, "utf-8"));

    return Response.json(customerData);
  } catch (error) {
    return Response.json(
      { error: "Failed to load customer data", details: error.message },
      { status: 500 }
    );
  }
}
