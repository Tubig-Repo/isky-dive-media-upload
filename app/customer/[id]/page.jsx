"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Download, Image, Video } from "lucide-react";

export default function CustomerPage() {
  const params = useParams();
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCustomerData() {
      try {
        const response = await fetch(`/api/customer/${params.id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Customer not found");
        }

        setCustomerData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadCustomerData();
    }
  }, [params.id]);
  useEffect(() => {
    if (customerData) {
      const lockedVideos =
        customerData.videos?.filter((v) => !v.isFreePreview) || [];
      console.log("🔒 Locked videos:", lockedVideos);
    }
  }, [customerData]);

  const handleLockedVideoClick = () => {
    if (customerData?.paymentLink) {
      window.location.href = customerData.paymentLink;
    } else {
      alert("Please contact us to unlock full access to all videos!");
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700 font-semibold">
            Loading your content...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Content Not Found
          </h1>
          <p className="text-gray-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  const isExpired =
    customerData.expiresAt && new Date(customerData.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Link Expired
          </h1>
          <p className="text-gray-600 text-lg">
            This content link expired on{" "}
            {new Date(customerData.expiresAt).toLocaleDateString()}.
          </p>
          <p className="text-gray-500 mt-2">
            Please contact support for renewed access.
          </p>
        </div>
      </div>
    );
  }

  const freeVideos = customerData.videos?.filter((v) => v.isFreePreview) || [];
  const lockedVideos =
    customerData.videos?.filter((v) => !v.isFreePreview) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">
              Hello, {customerData.customerName}! 👋
            </h1>
            <p className="text-xl opacity-90">
              Your exclusive content is ready
            </p>

            {/* Payment Status Badge */}
            <div className="mt-4">
              <span
                className={`inline-block px-6 py-2 rounded-full text-sm font-bold ${
                  customerData.isPaid
                    ? "bg-green-400 text-green-900"
                    : "bg-yellow-400 text-yellow-900"
                }`}
              >
                {customerData.isPaid
                  ? "✓ Full Access Unlocked"
                  : "⚠️ Payment Pending - Limited Preview"}
              </span>
            </div>
          </div>

          {/* Custom Message */}
          {customerData.customMessage && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 m-6 rounded-r-lg">
              <p className="text-gray-800 text-lg">
                {customerData.customMessage}
              </p>
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Photos Section */}
            {customerData.photos && customerData.photos.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <Image className="mr-2 text-purple-600" size={28} />
                  Your Photos ({customerData.photos.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {customerData.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-md">
                        <img
                          src={photo.url}
                          alt={photo.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <button
                        onClick={() =>
                          handleDownload(photo.url, photo.filename)
                        }
                        className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download size={20} className="text-gray-700" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Free Preview Videos */}
            {freeVideos.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <Video className="mr-2 text-green-600" size={28} />
                  Free Preview Video
                </h2>
                {freeVideos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
                  >
                    <video
                      controls
                      controlsList={customerData.isPaid ? "" : "nodownload"}
                      className="w-full"
                      style={{ maxHeight: "70vh" }}
                    >
                      <source src={video.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <div className="bg-gray-800 p-4 flex justify-between items-center">
                      <p className="text-white font-semibold">
                        {video.filename}
                      </p>
                      {customerData.isPaid && (
                        <button
                          onClick={() =>
                            handleDownload(video.url, video.filename)
                          }
                          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          <Download size={18} />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!customerData.isPaid && (
                  <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="text-yellow-800 text-center font-semibold">
                      ⚠️ This is a watermarked preview. Complete payment to
                      unlock {lockedVideos.length} more video
                      {lockedVideos.length !== 1 ? "s" : ""} in full quality!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Locked Videos */}
            {lockedVideos.length > 0 && !customerData.isPaid && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <Lock className="mr-2 text-red-600" size={28} />
                  Locked Videos ({lockedVideos.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lockedVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={handleLockedVideoClick}
                      className="relative bg-gray-900 rounded-xl overflow-hidden cursor-pointer group hover:shadow-2xl transition-shadow"
                    >
                      {/* Check if thumbnail exists */}
                      {video.thumbnailUrl ? (
                        // Show thumbnail with overlay
                        <div className="aspect-video relative">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.filename}
                            className="w-full h-full object-cover filter blur-sm brightness-50 group-hover:blur-none group-hover:brightness-75 transition-all duration-300"
                          />
                          {/* Lock Overlay */}
                          <div className="absolute inset-0 bg-opacity-60 flex flex-col items-center justify-center p-6">
                            <Lock
                              size={56}
                              className="text-red-500 mb-4 group-hover:scale-110 transition-transform"
                            />
                            <p className="text-white font-bold text-lg text-center mb-2">
                              {video.filename}
                            </p>
                            <p className="text-gray-300 text-sm text-center mb-4">
                              Complete payment to unlock
                            </p>
                            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg">
                              🔓 Unlock Now
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Fallback if no thumbnail
                        <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
                          <Lock
                            size={56}
                            className="text-red-500 mb-4 group-hover:scale-110 transition-transform"
                          />
                          <p className="text-white font-bold text-lg text-center mb-2">
                            {video.filename}
                          </p>
                          <p className="text-gray-400 text-sm text-center mb-4">
                            Complete payment to unlock
                          </p>
                          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                            🔓 Unlock Now
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unlocked Full Videos (After Payment) */}
            {customerData.isPaid && lockedVideos.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <Video className="mr-2 text-blue-600" size={28} />
                  Full Videos (Unlocked)
                </h2>
                <div className="space-y-6">
                  {lockedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
                    >
                      <video
                        controls
                        className="w-full"
                        style={{ maxHeight: "70vh" }}
                      >
                        <source src={video.url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="bg-gray-800 p-4 flex justify-between items-center">
                        <p className="text-white font-semibold">
                          {video.filename}
                        </p>
                        <button
                          onClick={() =>
                            handleDownload(video.url, video.filename)
                          }
                          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          <Download size={18} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 text-center border-t">
            <p className="text-gray-600 font-semibold">
              Thank you for your business! 💙
            </p>
            {customerData.expiresAt && (
              <p className="text-sm text-gray-500 mt-2">
                This link expires on{" "}
                {new Date(customerData.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
