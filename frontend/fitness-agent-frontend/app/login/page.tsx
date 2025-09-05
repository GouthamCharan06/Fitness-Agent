"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [descopeUrl, setDescopeUrl] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching Descope flow URL
    const fetchDescopeUrl = async () => {
      try {
        // Replace this with your actual flow URL or fetch from API
        const url = process.env.DESCOPE_LOGIN_URL!;
        // simulate network delay
        await new Promise((res) => setTimeout(res, 1000));
        setDescopeUrl(url);
      } finally {
        setLoading(false);
      }
    };

    fetchDescopeUrl();
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-96 flex flex-col items-center gap-6">
        <h1 className="text-4xl font-extrabold text-gray-800 animate-pulse">
          Fitness Agent
        </h1>
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
            <p className="text-gray-500">Loading login...</p>
          </div>
        ) : (
          <a
            href={descopeUrl || "#"}
            className="relative inline-block px-10 py-3 font-semibold text-white bg-blue-600 rounded-full shadow-lg overflow-hidden group hover:bg-blue-700 transition-all"
          >
            <span className="absolute inset-0 w-full h-full transition-transform transform translate-x-[-100%] bg-white opacity-20 group-hover:translate-x-0"></span>
            <span className="relative z-10">Login with Descope</span>
          </a>
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
