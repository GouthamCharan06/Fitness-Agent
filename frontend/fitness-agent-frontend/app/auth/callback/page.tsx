"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async (magicToken: string) => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: magicToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Verification failed");
        }

        const sessionJwt = data.sessionJwt;
        if (!sessionJwt) throw new Error("No session JWT returned");

        // ✅ Store JWT before redirecting
        localStorage.setItem("descope_jwt", sessionJwt);

        // ✅ Wait a tick to ensure storage is ready
        setTimeout(() => {
          router.replace("/chat");
        }, 50);
      } catch (err: any) {
        console.error("Magic link verification error:", err);
        setError(err.message || "Verification failed");
        setLoading(false);

        // Redirect to login after 3s
        setTimeout(() => router.replace("/"), 3000);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get("t");

    if (magicToken) {
      verifyToken(magicToken);
    } else {
      setError("No magic link token found.");
      setLoading(false);
      setTimeout(() => router.replace("/"), 3000);
    }
  }, [router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold text-gray-800 animate-pulse">
          {error ? "Login Failed" : "Logging you in..."}
        </h1>
        <p className="text-gray-500">
          {error || "Please wait while we verify your account."}
        </p>

        {!error && loading && (
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mt-6"></div>
        )}
      </div>

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
