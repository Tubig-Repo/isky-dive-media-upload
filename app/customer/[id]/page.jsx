// app/customer/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CustomerPage() {
  const params = useParams();
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCustomerData() {
      try {
        const response = await fetch(`/api/customer/${params.id}`);
        if (!response.ok) {
          throw new Error("Customer not found");
        }
        const data = await response.json();
        setCustomerData(data);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Video Not Found
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const isExpired =
    customerData.expiryDate && new Date(customerData.expiryDate) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Link Expired
          </h1>
          <p className="text-gray-600">
            This video link has expired. Please contact support for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-3xl font-bold">
              Hello, {customerData.customerName}! 👋
            </h1>
            <p className="mt-2 opacity-90">Your exclusive video is ready</p>
          </div>

          {/* Custom Message */}
          {customerData.customMessage && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 m-6">
              <p className="text-gray-700">{customerData.customMessage}</p>
            </div>
          )}

          {/* Video Player */}
          <div className="p-6">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
              <video controls className="w-full" style={{ maxHeight: "70vh" }}>
                <source src={customerData.videoPath} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Payment Status Badge */}
            <div className="mt-4 flex justify-center">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                  customerData.isPaid
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {customerData.isPaid ? "✓ Paid" : "⚠️ Payment Pending"}
              </span>
            </div>

            {/* Expiry Info */}
            {customerData.expiryDate && (
              <div className="mt-4 text-center text-sm text-gray-600">
                This link expires on{" "}
                {new Date(customerData.expiryDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 text-center text-sm text-gray-600">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
