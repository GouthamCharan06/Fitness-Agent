"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FitbitCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing Fitbit authentication...");

  useEffect(() => {
    const handleFitbitCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code) {
          setStatus("Missing Fitbit authorization code.");
          return;
        }

        // Validate PKCE code_verifier
        const codeVerifier = localStorage.getItem("fitbit_code_verifier");
        if (
          !codeVerifier ||
          codeVerifier.length < 43 ||
          codeVerifier.length > 128
        ) {
          console.error(
            "Invalid PKCE code_verifier length:",
            codeVerifier?.length
          );
          setStatus("Invalid PKCE code_verifier. Please re-initiate login.");
          return;
        }

        // Validate OAuth state
        const storedState = localStorage.getItem("fitbit_oauth_state");
        if (state !== storedState) {
          console.error("State mismatch. Potential CSRF attack.");
          setStatus("State mismatch detected. Please try again.");
          return;
        }

        // Must match exactly the redirect used in auth request
        const redirectUri = `${window.location.origin}/fitbit/complete`;

        // Send code + verifier to backend for token exchange
        const tokenResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify/fitbit/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fitbit_code: code,
              code_verifier: codeVerifier,
              redirect_uri: redirectUri,
              user_jwt: localStorage.getItem("descope_jwt"),
            }),
          }
        );

        const data = await tokenResponse.json();
        if (!tokenResponse.ok || !data.tokens?.access_token) {
          console.error("Backend token exchange failed:", data);
          setStatus("Error exchanging token. Please try again.");
          return;
        }

        console.log("✅ Fitbit tokens received:", data.tokens);

        // Save tokens locally
        localStorage.setItem("fitbit_token", data.tokens.access_token);
        localStorage.setItem("fitbit_tokens", JSON.stringify(data.tokens));
        localStorage.setItem("fitbit_authenticated", "true");

        setStatus("Fitbit authentication successful! Redirecting...");

        // Clear query params
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        setTimeout(() => {
          router.replace("/chat");
        }, 1500);
      } catch (error) {
        console.error("Error during Fitbit OAuth callback:", error);
        setStatus("An unexpected error occurred during authentication.");
      }
    };

    handleFitbitCallback();
  }, [router]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
      <p className="text-gray-700 text-lg">{status}</p>
    </div>
  );
}
