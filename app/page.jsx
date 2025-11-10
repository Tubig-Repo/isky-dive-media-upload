// app/upload/page.js or components/UploadForm.js
"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a file");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Response:", data); // See it in console

      setResult(data); // Store in state to display

      // Optionally redirect to customer page
      // window.location.href = data.pageUrl;
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Video</h1>

      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="block"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          {loading ? "Processing..." : "Upload"}
        </button>
      </form>

      {/* Display the response */}
      {result && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded">
          <h2 className="font-bold text-green-800 mb-2">✓ {result.message}</h2>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Video ID:</strong> {result.videoId}
            </p>

            <p>
              <strong>Customer Page:</strong>{" "}
              <a
                href={result.pageUrl}
                className="text-blue-600 underline"
                target="_blank"
              >
                {result.pageUrl}
              </a>
            </p>

            <p>
              <strong>Watermarked URL:</strong> {result.watermarkedUrl}
            </p>

            {/* Preview the watermarked video */}
            <div className="mt-4">
              <video
                src={result.watermarkedUrl}
                controls
                className="w-full max-w-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
