"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, Video, Image, X, Star } from "lucide-react";

export default function StaffUpload() {
  const [formData, setFormData] = useState({
    photos: [],
    videos: [], // Will store objects with {file, isFree}
    customerName: "",
    customerEmail: "",
    isPaid: false,
    expiryDays: "",
    customMessage: "",
    paymentLink: "", // Link where locked content redirects
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, photos: [...formData.photos, ...files] });
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files);
    const newVideos = files.map((file) => ({
      file,
      isFree: false, // All videos locked by default
    }));

    // Maximum 5 videos
    const updatedVideos = [...formData.videos, ...newVideos].slice(0, 5);
    setFormData({ ...formData, videos: updatedVideos });
  };

  const removePhoto = (index) => {
    const updated = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: updated });
  };

  const removeVideo = (index) => {
    const updated = formData.videos.filter((_, i) => i !== index);
    setFormData({ ...formData, videos: updated });
  };

  const toggleVideoFree = (index) => {
    // Only allow ONE video to be free (the watermarked preview)
    const updated = formData.videos.map((video, i) => ({
      ...video,
      isFree: i === index, // Only the clicked video becomes free, all others locked
    }));
    setFormData({ ...formData, videos: updated });
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

    if (!formData.customerName) {
      alert("Please provide a customer name");
      return;
    }

    if (formData.videos.length === 0 && formData.photos.length === 0) {
      alert("Please upload at least one photo or video");
      return;
    }

    if (formData.videos.length > 5) {
      alert("Maximum 5 videos allowed");
      return;
    }

    // Check if exactly one video is marked as free
    const freeVideoCount = formData.videos.filter((v) => v.isFree).length;
    if (formData.videos.length > 0 && freeVideoCount === 0) {
      alert("Please select exactly ONE video as the free watermarked preview");
      return;
    }

    setLoading(true);
    setResult(null);

    const submitData = new FormData();

    // Append photos
    formData.photos.forEach((photo) => {
      submitData.append("photos", photo);
    });

    // Append videos with metadata
    formData.videos.forEach((video, index) => {
      submitData.append("videos", video.file);
      submitData.append(
        `videoMeta_${index}`,
        JSON.stringify({ isFree: video.isFree })
      );
    });

    submitData.append("customerName", formData.customerName);
    submitData.append("customerEmail", formData.customerEmail);
    submitData.append("isPaid", formData.isPaid);
    submitData.append("expiryDays", formData.expiryDays);
    submitData.append("customMessage", formData.customMessage);
    submitData.append("paymentLink", formData.paymentLink);
    submitData.append("videoCount", formData.videos.length);

    try {
      const response = await fetch("/api/upload-customer-media", {
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
        photos: [],
        videos: [],
        customerName: "",
        customerEmail: "",
        isPaid: false,
        expiryDays: "",
        customMessage: "",
        paymentLink: "",
      });

      // Reset file inputs
      document.querySelectorAll('input[type="file"]').forEach((input) => {
        input.value = "";
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = async (customerId) => {
    if (!customerId) return;

    const confirmMsg = formData.isPaid
      ? "Lock this customer's content?"
      : "Unlock all content for this customer?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch("/api/toggle-payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          isPaid: !formData.isPaid,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormData({ ...formData, isPaid: !formData.isPaid });
        alert(data.message || "Payment status updated");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">
            📹 📷 Customer Media Upload
          </h1>
          <p className="text-gray-600 mb-8">
            Upload photos and videos for customers with payment lock options
          </p>

          <div className="space-y-6">
            {/* Customer Info Section */}
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h2 className="text-lg font-bold text-blue-900 mb-4">
                Customer Information
              </h2>

              <div className="space-y-4">
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
              </div>
            </div>

            {/* Photos Upload Section */}
            <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <h2 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                <Image className="mr-2" size={20} />
                Photos (Unlimited)
              </h2>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-600 file:text-white
                  hover:file:bg-purple-700 cursor-pointer mb-4"
              />

              {formData.photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative p-3 bg-white rounded border border-purple-200 group"
                    >
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                      <Image
                        className="mx-auto mb-2 text-purple-600"
                        size={24}
                      />
                      <p className="text-xs text-gray-600 truncate">
                        {photo.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(photo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos Upload Section */}
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <h2 className="text-lg font-bold text-green-900 mb-2 flex items-center">
                <Video className="mr-2" size={20} />
                Videos (Max 5)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                ⭐ Select exactly <strong>ONE</strong> video as "Free Preview" -
                it will be watermarked. Other videos stay locked.
              </p>

              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoChange}
                disabled={formData.videos.length >= 5}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-600 file:text-white
                  hover:file:bg-green-700 cursor-pointer mb-4
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />

              <p className="text-xs text-gray-500 mb-4">
                {formData.videos.length} / 5 videos uploaded
              </p>

              {formData.videos.length > 0 && (
                <div className="space-y-3">
                  {formData.videos.map((video, index) => (
                    <div
                      key={index}
                      className={`relative p-4 rounded-lg border-2 ${
                        video.isFree
                          ? "bg-white border-green-500"
                          : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      <button
                        onClick={() => removeVideo(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={16} />
                      </button>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {video.isFree ? (
                            <Unlock className="text-green-600" size={24} />
                          ) : (
                            <Lock className="text-gray-600" size={24} />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {video.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(video.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleVideoFree(index)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                            video.isFree
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                          }`}
                        >
                          {video.isFree ? (
                            <>
                              <Star className="inline mr-1" size={14} />
                              Watermarked Preview
                            </>
                          ) : (
                            <>
                              <Lock className="inline mr-1" size={14} />
                              Select as Preview
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Link Section */}
            <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <h2 className="text-lg font-bold text-yellow-900 mb-2">
                💳 Payment Settings
              </h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Link (Where locked content redirects)
              </label>
              <input
                type="url"
                name="paymentLink"
                value={formData.paymentLink}
                onChange={handleInputChange}
                placeholder="https://your-payment-page.com/checkout"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                When customers click locked videos, they'll be redirected here
                to complete payment
              </p>
            </div>

            {/* Additional Settings */}
            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  name="customMessage"
                  value={formData.customMessage}
                  onChange={handleInputChange}
                  placeholder="Thank you for choosing us! Here are your photos and videos."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg
                hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors shadow-lg"
            >
              {loading
                ? "Processing & Uploading..."
                : "🚀 Create Customer Page"}
            </button>
          </div>

          {/* Success Result */}
          {result && (
            <div className="mt-8 p-6 bg-green-50 border-2 border-green-300 rounded-lg">
              <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">✓</span>
                Customer Page Created Successfully!
              </h3>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer:</p>
                    <p className="font-semibold text-lg">
                      {result.customerName}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Media Uploaded:
                    </p>
                    <div className="flex space-x-3">
                      {result.photoCount > 0 && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                          📷 {result.photoCount} Photos
                        </span>
                      )}
                      {result.videoCount > 0 && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          📹 {result.videoCount} Videos
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Status Toggle */}
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Payment Status
                      </p>
                      <p className="text-xs text-gray-500">
                        Toggle when customer completes payment
                      </p>
                    </div>
                    <button
                      onClick={() => togglePaymentStatus(result.customerId)}
                      className={`px-6 py-3 rounded-lg font-bold transition-all ${
                        formData.isPaid
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {formData.isPaid ? (
                        <>
                          <Unlock className="inline mr-2" size={18} />
                          UNLOCKED
                        </>
                      ) : (
                        <>
                          <Lock className="inline mr-2" size={18} />
                          LOCKED
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Customer Page URL */}
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Customer Page URL:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={result.customerUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(result.customerUrl)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4">
                  <a
                    href={result.customerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    👁️ View Customer Page
                  </a>
                  <button
                    onClick={() => copyToClipboard(result.customerUrl)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
