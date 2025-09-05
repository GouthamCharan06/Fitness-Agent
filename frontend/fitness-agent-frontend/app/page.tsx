"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    // Simulate network delay for hackathon scenario
    await new Promise((res) => setTimeout(res, 1000));

    // Redirect to Descope login flow
    const descopeUrl = process.env.NEXT_PUBLIC_DESCOPE_LOGIN_URL!;
    if (!descopeUrl) throw new Error("DESCOPE_LOGIN_URL not set");
    window.location.href = descopeUrl;
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md flex flex-col items-center gap-6">
        {/* App Title */}
        <h1 className="text-4xl font-extrabold text-gray-800 animate-pulse">
          Fitness Agent
        </h1>
        <h2 className="text-lg text-gray-600">Login to continue</h2>

        {/* Login Button or Loader */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 mt-6">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
            <p className="text-gray-500">Redirecting...</p>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="relative inline-block px-10 py-3 font-semibold text-white bg-blue-600 rounded-full shadow-lg overflow-hidden group hover:bg-blue-700 transition-all mt-6"
          >
            <span className="absolute inset-0 w-full h-full transition-transform transform -translate-x-full bg-white opacity-20 group-hover:translate-x-0"></span>
            <span className="relative z-10">Login with Descope</span>
          </button>
        )}
      </div>

      {/* Loader animation styles */}
      <style jsx>{`
        .loader {
          border-top-color: #3b82f6;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
