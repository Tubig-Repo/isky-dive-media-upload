"use client";

import { useState } from "react";

export default function StaffUpload() {
  const [formData, setFormData] = useState({
    file: null,
    customerName: "",
    customerEmail: "",
    isPaid: false,
    expiryDays: "",
    customMessage: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.file || !formData.customerName) {
      alert("Please provide a video file and customer name");
      return;
    }

    setLoading(true);
    setResult(null);

    const submitData = new FormData();
    submitData.append("file", formData.file);
    submitData.append("customerName", formData.customerName);
    submitData.append("customerEmail", formData.customerEmail);
    submitData.append("isPaid", formData.isPaid);
    submitData.append("expiryDays", formData.expiryDays);
    submitData.append("customMessage", formData.customMessage);

    try {
      const response = await fetch("/api/test-watermark", {
        method: "POST",
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data.data);

      // Reset form
      setFormData({
        file: null,
        customerName: "",
        customerEmail: "",
        isPaid: false,
        expiryDays: "",
        customMessage: "",
      });

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">📹 Upload Customer Video</h1>
          <p className="text-gray-600 mb-8">
            Upload a video and generate a unique customer page
          </p>

          <div className="space-y-6">
            {/* Video File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File *
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Customer Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Email (Optional)
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                placeholder="customer@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Payment Status */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                name="isPaid"
                id="isPaid"
                checked={formData.isPaid}
                onChange={handleInputChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label
                htmlFor="isPaid"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Customer has paid (light watermark)
              </label>
            </div>

            <div className="text-xs text-gray-500 -mt-4 ml-8">
              {formData.isPaid
                ? "⚠️ Heavy watermark will be applied (full screen overlay)"
                : "No Watermark is applied"}
            </div>

            {/* Expiry Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Expires In (Days)
              </label>
              <input
                type="number"
                name="expiryDays"
                value={formData.expiryDays}
                onChange={handleInputChange}
                placeholder="7"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for no expiration
              </p>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                name="customMessage"
                value={formData.customMessage}
                onChange={handleInputChange}
                placeholder="Thank you for your purchase!"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
                hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors"
            >
              {loading ? "Processing..." : "Upload & Generate Customer Page"}
            </button>
          </div>

          {/* Success Result */}
          {result && (
            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-bold text-green-800 mb-4">
                ✓ Customer Page Created!
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Customer:</p>
                  <p className="font-semibold">{result.customerName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status:</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      result.isPaid
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {result.isPaid ? "Paid" : "Unpaid"}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Customer Page URL:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={result.pageUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(result.pageUrl)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <a
                    href={result.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700 text-sm"
                  >
                    View Customer Page
                  </a>
                  <a
                    href={result.watermarkedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-gray-600 text-white text-center rounded hover:bg-gray-700 text-sm"
                  >
                    Preview Video
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
