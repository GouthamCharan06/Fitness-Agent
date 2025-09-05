"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";

/* ----------------------------- Chat components ---------------------------- */

function ChatBubble({
  message,
  isUser,
  avatar,
}: {
  message: string;
  isUser: boolean;
  avatar?: React.ReactNode;
}) {
  return (
    <div
      className={`flex mb-3 items-end ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && avatar && <div className="mr-2">{avatar}</div>}
      <div
        className={`max-w-[70%] px-6 py-4 rounded-3xl shadow-md text-base ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
        style={{ whiteSpace: "pre-wrap" }}
      >
        {message}
      </div>
    </div>
  );
}

function AgentThinkingBubble({ avatar }: { avatar?: ReactNode }) {
  return (
    <div className="flex justify-start mb-3 items-end">
      {avatar && <div className="mr-2">{avatar}</div>}
      <div className="max-w-[70%] px-6 py-4 rounded-3xl shadow-md bg-gray-100 text-gray-900 border flex items-center gap-2">
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <span
              key={i}
              className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
        <span className="ml-2 italic text-gray-600">Thinking...</span>
      </div>
    </div>
  );
}

/* ------------------------------- Modals --------------------------------- */

function ConsentModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Consent for Secure Multi-Agent Assistance
        </h2>
        <div className="text-gray-700 space-y-3 text-sm leading-relaxed">
          <p>
            This application uses internal agents (Trainer, Nutrition, Recovery)
            to generate personalized responses. By continuing, you agree to let
            these agents read your input messages so they can collaborate and
            respond.
          </p>
          <p>
            We are integrated with Fitbit to generate personalized recovery
            suggestions. If linked, agents may read your Fitbit data (activity,
            sleep, heart rate, profile) strictly for insights. Your data will
            not be modified.
          </p>
          <p className="text-xs text-gray-500">
            Access is protected with Descope-issued scoped tokens and delegated
            consent. You can link or unlink Fitbit anytime using the badge in
            the header (next to Logout).
          </p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onAccept}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            I Agree &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function RecoveryModal({
  visible,
  onClose,
  onUseFitbit,
  onManual,
  isFitbitLinked,
}: {
  visible: boolean;
  onClose: () => void;
  onUseFitbit: () => void;
  onManual: (sleepHours: string, proteinGrams: string) => void;
  isFitbitLinked: boolean;
}) {
  const [sleepHours, setSleepHours] = useState("");
  const [proteinGrams, setProteinGrams] = useState("");

  useEffect(() => {
    if (!visible) {
      setSleepHours("");
      setProteinGrams("");
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border p-6">
        <h3 className="text-lg font-semibold mb-3">Recovery data source</h3>
        <p className="text-sm text-gray-700 mb-4">
          Choose how you'd like to provide recovery data for this query.
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => onUseFitbit()}
            className={`flex-1 px-4 py-3 rounded-lg border ${
              isFitbitLinked
                ? "border-green-500 bg-green-50"
                : "border-gray-300"
            }`}
          >
            Use Fitbit {isFitbitLinked ? " (linked)" : " (not linked)"}
          </button>

          <button
            onClick={() => {
              // intentionally does nothing here — manual inputs are below
            }}
            className="px-4 py-3 rounded-lg border border-gray-300"
          >
            Manual entry
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">
            Sleep hours (optional)
          </label>
          <input
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            placeholder="e.g. 7.5"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Protein (grams) (optional)
          </label>
          <input
            value={proteinGrams}
            onChange={(e) => setProteinGrams(e.target.value)}
            placeholder="e.g. 120"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              // If Fitbit linked and nothing entered -> proceed with Fitbit
              if (isFitbitLinked && sleepHours === "" && proteinGrams === "") {
                onUseFitbit();
              } else if (
                isFitbitLinked &&
                (sleepHours !== "" || proteinGrams !== "")
              ) {
                // Prefer Fitbit but forward manual inputs as well (existing behavior)
                onUseFitbit();
              } else {
                // Manual flow
                onManual(sleepHours, proteinGrams);
              }
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function UnlinkConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border p-6">
        <h3 className="text-lg font-semibold mb-2">Unlink Fitbit?</h3>
        <p className="text-sm text-gray-700 mb-4">
          Are you sure you want to unlink your Fitbit account? Agents will fall
          back to manual recovery inputs.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white"
          >
            Unlink
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Main Page -------------------------------- */

export default function ChatPage() {
  const router = useRouter();

  /* ----------------------------- Core state ----------------------------- */
  const [messages, setMessages] = useState<{ text: string; user?: boolean }[]>(
    () => {
      if (typeof window === "undefined") return [];
      const saved = localStorage.getItem("chat_messages");
      return saved ? JSON.parse(saved) : [];
    }
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* -------------------------- Consent & auth state ---------------------- */
  const [showConsent, setShowConsent] = useState(false);
  const [agentConsentGranted, setAgentConsentGranted] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem("agent_consent_granted") === "true";
    }
  );

  /* ------------------------------- Fitbit ------------------------------- */
  const [fitbitToken, setFitbitToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("fitbit_token");
  });
  const [fitbitAuthenticated, setFitbitAuthenticated] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem("fitbit_authenticated") === "true";
    }
  );
  const [fitbitWelcomeShown, setFitbitWelcomeShown] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("fitbit_welcome_shown") === "true";
  });

  /* ---------------------------- Recovery state -------------------------- */
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [pendingRecoveryMessage, setPendingRecoveryMessage] = useState<
    string | null
  >(null);

  /* ---------------------------- Unlink modal ---------------------------- */
  const [unlinkModalVisible, setUnlinkModalVisible] = useState(false);

  /* --------------------------- UI & refs ------------------------------- */
  const scrollRef = useRef<HTMLDivElement>(null);
  const agentAvatar = (
    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
      A
    </div>
  );

  const presetMessages = [
    "Hello! What's this application about?",
    "Suggest some back workouts",
    "Give me a diet plan for muscle gain",
    "I want to grow my arms. Suggest a training plan",
    "How is my recovery today?",
    "How should I recover after a leg workout?",
  ];

  /* ------------------------- Persist & effects ------------------------- */

  useEffect(() => {
    localStorage.setItem("chat_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(
      "agent_consent_granted",
      agentConsentGranted ? "true" : "false"
    );
  }, [agentConsentGranted]);

  useEffect(() => {
    // Auto-scroll to bottom when messages or loading change
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    // redirect if session absent
    if (typeof window !== "undefined" && !localStorage.getItem("descope_jwt")) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!agentConsentGranted) setShowConsent(true);
  }, [agentConsentGranted]);

  /* ------------------------ Fitbit OAuth callback ---------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState = localStorage.getItem("fitbit_oauth_state");

    if (!code) return;
    if (storedState && state && state !== storedState) {
      console.warn("Fitbit OAuth state mismatch; ignoring callback.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const codeVerifier = localStorage.getItem("fitbit_code_verifier");
    if (!codeVerifier) {
      console.warn("No PKCE code_verifier found; ignoring callback.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    (async () => {
      try {
        setMessages((m) => [
          ...m,
          { text: "Fetching your Fitbit data...", user: false },
        ]);
        const redirectUri = `${window.location.origin}/api/auth/verify/fitbit/callback`;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify/fitbit/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fitbit_code: code,
              code_verifier: codeVerifier,
              user_jwt: localStorage.getItem("descope_jwt"),
              redirect_uri: redirectUri,
            }),
          }
        );

        const data = await res.json();

        if (res.ok && data.tokens?.access_token) {
          localStorage.setItem("fitbit_token", data.tokens.access_token);
          localStorage.setItem("fitbit_tokens", JSON.stringify(data.tokens));
          localStorage.setItem("fitbit_authenticated", "true");
          setFitbitToken(data.tokens.access_token);
          setFitbitAuthenticated(true);

          if (!fitbitWelcomeShown) {
            setMessages((m) => [
              ...m,
              {
                text: "This application is now integrated with your Fitbit account. You can now ask recovery-based queries regarding the same.",
                user: false,
              },
            ]);
            localStorage.setItem("fitbit_welcome_shown", "true");
            setFitbitWelcomeShown(true);
          }

          // try init call (best-effort)
          try {
            const jwt = localStorage.getItem("descope_jwt");
            if (jwt) {
              await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/agent/recovery/init`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                  },
                  body: JSON.stringify({
                    fitbit_token: data.tokens.access_token,
                    note: "initial_validation_from_frontend",
                  }),
                }
              );
            }
          } catch (e) {
            console.warn("Recovery init call failed:", e);
          }
        } else {
          throw new Error("Token exchange failed");
        }
      } catch (err) {
        console.error("Error fetching Fitbit token:", err);
        setFitbitAuthenticated(false);
        setMessages((m) => [
          ...m,
          {
            text: "Couldn't link Fitbit. Falling back to manual recovery logs.",
            user: false,
          },
        ]);
        localStorage.removeItem("fitbit_token");
        localStorage.removeItem("fitbit_tokens");
        localStorage.setItem("fitbit_authenticated", "false");
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------- PKCE helpers --------------------------- */

  function base64UrlEncode(array: Uint8Array) {
    let str = "";
    for (const byte of array) str += String.fromCharCode(byte);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function generateCodeVerifier(): string {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(hash));
  }

  async function startFitbitOAuth() {
    try {
      const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID!;
      const redirectUri = `${window.location.origin}/api/auth/verify/fitbit/callback`;
      const scope = "activity heartrate sleep profile";

      const codeVerifier = generateCodeVerifier();
      localStorage.setItem("fitbit_code_verifier", codeVerifier);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = crypto.randomUUID();
      localStorage.setItem("fitbit_oauth_state", state);

      const authUrl =
        `https://www.fitbit.com/oauth2/authorize?response_type=code` +
        `&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&state=${state}`;

      window.location.href = authUrl;
    } catch (e) {
      console.error("Failed to start Fitbit OAuth", e);
      setMessages((m) => [
        ...m,
        {
          text: "Failed to start Fitbit link. You can proceed with manual logs.",
          user: false,
        },
      ]);
    }
  }

  /* ---------------------------- Auth helpers --------------------------- */

  function handleLogout() {
    localStorage.removeItem("descope_jwt");
    localStorage.removeItem("agent_consent_granted");
    localStorage.removeItem("fitbit_token");
    localStorage.removeItem("fitbit_tokens");
    localStorage.removeItem("fitbit_authenticated");
    localStorage.removeItem("fitbit_oauth_state");
    localStorage.removeItem("fitbit_code_verifier");
    localStorage.removeItem("fitbit_welcome_shown");
    setFitbitToken(null);
    setFitbitAuthenticated(false);
    setAgentConsentGranted(false);
    router.replace("/");
  }

  function acceptConsent() {
    localStorage.setItem("agent_consent_granted", "true");
    setAgentConsentGranted(true);
    setShowConsent(false);
    setMessages((m) => [
      ...m,
      {
        text: "Consent granted. You can unlink Fitbit anytime using the badge beside Logout.",
        user: false,
      },
    ]);
  }

  /* ------------------------- Recovery detection ------------------------ */

  function looksLikeRecoveryQuery(text: string) {
    const lower = text.toLowerCase();
    const keywords = [
      "recovery",
      "recover",
      "how is my recovery",
      "how should i recover",
      "recover after",
      "recovery-based",
      "sleep",
      "rest",
      "recovery score",
    ];
    return keywords.some((k) => lower.includes(k));
  }

  /* ---------------------------- Backend call --------------------------- */

  async function sendToBackend(
    messageToSend: string,
    fitbit_token: string | null,
    extra?: Record<string, any>
  ) {
    setLoading(true);
    // show thinking bubble
    setMessages((m) => [...m, { text: "thinking", user: false }]);

    try {
      const jwt = localStorage.getItem("descope_jwt");
      if (!jwt) throw new Error("No session");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/agent_query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            context: messageToSend,
            consent_granted: agentConsentGranted,
            fitbit_token: fitbit_token,
            manual_data: extra ?? null,
          }),
        }
      );

      const data = await response.json();
      // remove thinking
      setMessages((m) => m.filter((msg) => msg.text !== "thinking"));

      const botReply =
        data.message?.trim() || "Sorry, I couldn't understand that.";
      setMessages((m) => [...m, { text: botReply }]);
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((m) => [
        ...m.filter((msg) => msg.text !== "thinking"),
        { text: "Error contacting server.", user: false },
      ]);
    } finally {
      setLoading(false);
    }
  }
  const clearChat = async () => {
    const userToken = localStorage.getItem("descope_jwt"); // Or from state/context
    if (!userToken) {
      console.error("User token not found");
      return;
    }

    try {
      const userId = localStorage.getItem("descope_jwt"); // Use correct key
      if (!userId) throw new Error("User not logged in");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/clear_chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      const data = await res.json();

      if (data.status === "ok") {
        setMessages([]); // Clear chat messages in frontend
        console.log("Chat cleared successfully");
      } else {
        console.error("Failed to clear chat:", data.message);
      }
    } catch (err) {
      console.error("Failed to clear chat", err);
    }
  };

  /* ------------------------------ handleSend --------------------------- */
  // Single entry point for sends (preset prompts, composer, manual recovery, fitbit recovery)

  async function handleSend(
    msgOverride?: string,
    manualData?: { sleepHours?: number; proteinIntake?: number }
  ) {
    const messageToSend = (msgOverride ?? input).trim();
    if (!messageToSend) return;

    // show user bubble (immediate)
    setMessages((m) => [...m, { text: messageToSend, user: true }]);
    if (!msgOverride) setInput("");

    // If manualData provided (coming from a manual recovery flow), show the manual data in chat first
    if (manualData) {
      setMessages((m) => [
        ...m,
        {
          text: `Manual data submitted:\n- Sleep: ${
            manualData.sleepHours ?? "?"
          } hours\n- Protein: ${manualData.proteinIntake ?? "?"} g`,
          user: true,
        },
      ]);
    }

    // If it looks like a recovery query and we don't already have manualData, open recovery modal
    if (looksLikeRecoveryQuery(messageToSend) && !manualData) {
      setPendingRecoveryMessage(messageToSend);
      setRecoveryModalVisible(true);
      return;
    }

    // send to backend with appropriate fitbit token / manual data
    try {
      setLoading(true);
      setMessages((m) => [...m, { text: "thinking", user: false }]);

      const jwt = localStorage.getItem("descope_jwt");
      if (!jwt) throw new Error("No session");

      // If manualData exists, pass it as part of manual_data; otherwise pass null.
      const manual_payload = manualData
        ? {
            sleep_hours: manualData.sleepHours ?? null,
            protein_grams: manualData.proteinIntake ?? null,
          }
        : null;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/agent_query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            context: messageToSend,
            consent_granted: agentConsentGranted,
            fitbit_token: fitbitAuthenticated ? fitbitToken : null,
            manual_data: manual_payload,
          }),
        }
      );

      const data = await response.json();
      setMessages((m) => m.filter((msg) => msg.text !== "thinking"));

      const botReply =
        data.message?.trim() || "Sorry, I couldn't understand that.";
      setMessages((m) => [...m, { text: botReply }]);
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((m) => [
        ...m.filter((msg) => msg.text !== "thinking"),
        { text: "Error contacting server.", user: false },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------ Recovery modal handlers -------------------- */

  function onRecoveryUseFitbit() {
    setRecoveryModalVisible(false);
    const pending = pendingRecoveryMessage;
    setPendingRecoveryMessage(null);
    if (!pending) return;

    if (fitbitAuthenticated && fitbitToken) {
      // proceed using fitbit token
      sendToBackend(pending, fitbitToken, undefined);
    } else {
      // don't auto-start OAuth — instruct the user to click badge
      setMessages((m) => [
        ...m,
        {
          text: "If you want Fitbit-based suggestions, please link your Fitbit account by clicking the Fitbit badge beside the Logout button. You can also choose manual entry.",
          user: false,
        },
      ]);

      // remove any thinking bubble
      setMessages((m) => m.filter((msg) => msg.text !== "thinking"));
      setLoading(false);
    }
  }

  function onRecoveryManual(sleepHours: string, proteinGrams: string) {
    setRecoveryModalVisible(false);
    const pending = pendingRecoveryMessage;
    setPendingRecoveryMessage(null);
    if (!pending) return;

    // show manual inputs as a user message & send to backend
    const sleepVal = sleepHours || null;
    const proteinVal = proteinGrams || null;

    setMessages((m) => [
      ...m,
      {
        text: `Manual data submitted:\n- Sleep: ${
          sleepVal ?? "?"
        } hours\n- Protein: ${proteinVal ?? "?"} g`,
        user: true,
      },
    ]);

    // Compose manualData in the same shape handleSend expects and call handleSend with override to avoid double UI ask
    const manualData = {
      sleepHours: sleepVal ? Number(sleepVal) : undefined,
      proteinIntake: proteinVal ? Number(proteinVal) : undefined,
    };

    // Use handleSend to preserve single send flow (it will send manual_data in payload)
    handleSend(pending, manualData);
  }

  /* ------------------------ Fitbit badge handlers ----------------------- */

  function onFitbitBadgeClick() {
    if (fitbitAuthenticated) {
      setUnlinkModalVisible(true);
    } else {
      // start OAuth flow
      startFitbitOAuth();
    }
  }

  function confirmUnlinkFitbit() {
    localStorage.removeItem("fitbit_token");
    localStorage.removeItem("fitbit_tokens");
    localStorage.setItem("fitbit_authenticated", "false");
    setFitbitToken(null);
    setFitbitAuthenticated(false);
    setUnlinkModalVisible(false);
    setMessages((m) => [
      ...m,
      {
        text: "Fitbit unlinked. Recovery queries will now use manual inputs unless you link again.",
        user: false,
      },
    ]);
  }

  /* -------------------------------- Render ------------------------------- */
  return (
    <div className="relative flex w-full max-w-7xl mx-auto h-[calc(100vh-122px)] mt-2 bg-white rounded-xl shadow-xl overflow-hidden">
      <section className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-gray-50">
          <span className="text-gray-700 font-medium text-lg">
            Fitness Agent
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onFitbitBadgeClick}
              title={
                fitbitAuthenticated
                  ? "Fitbit linked — click to unlink"
                  : "Fitbit not linked — click to link"
              }
              className={`text-sm px-2 py-1 rounded-full border ${
                fitbitAuthenticated
                  ? "border-green-500 text-green-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {fitbitAuthenticated ? "Fitbit • Linked" : "Fitbit • Not linked"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 pt-6 pb-4 flex flex-col gap-4">
          {messages.map((msg, i) =>
            msg.text === "thinking" ? (
              <AgentThinkingBubble key={i} avatar={agentAvatar} />
            ) : (
              <div
                key={i}
                className={`flex mb-3 items-end ${
                  msg.user ? "justify-end" : "justify-start"
                }`}
              >
                {!msg.user && agentAvatar && (
                  <div className="mr-2">{agentAvatar}</div>
                )}
                <div
                  className={`max-w-[70%] px-6 py-4 rounded-3xl shadow-md text-base ${
                    msg.user
                      ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {msg.text}
                </div>
              </div>
            )
          )}
          <div ref={scrollRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-8 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-gray-600 text-sm font-semibold">
              Quick Questions:
            </span>
            <button
              onClick={async () => {
                const userToken = localStorage.getItem("descope_jwt"); // Or from state/context
                if (!userToken) {
                  console.error("User token not found");
                  return;
                }
                try {
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/clear_chat`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${userToken}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const data = await res.json();
                  if (data.status === "ok") {
                    setMessages([]); // Clear chat messages in frontend
                    setInput(""); // Reset input field
                    console.log("Chat cleared successfully");
                  }
                } catch (err) {
                  console.error("Failed to clear chat", err);
                }
              }}
              className="text-blue-600 underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-3">
          {presetMessages.map((msg, i) => (
            <button
              key={i}
              onClick={() => handleSend(msg)}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full shadow-md transition transform hover:scale-105"
            >
              {msg}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 z-10 flex gap-4 border-t border-gray-300 bg-gray-50 px-8 py-5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            disabled={loading}
            className="w-full rounded-3xl border border-blue-300 px-6 py-3 text-base shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading}
            className="rounded-3xl bg-blue-600 px-10 py-3 text-lg font-semibold text-white shadow-md hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </section>

      {/* Consent Modal (only appears until accepted) */}
      {showConsent && <ConsentModal onAccept={acceptConsent} />}

      {/* Recovery Modal */}
      <RecoveryModal
        visible={recoveryModalVisible}
        onClose={() => {
          setRecoveryModalVisible(false);
          setPendingRecoveryMessage(null);
        }}
        onUseFitbit={onRecoveryUseFitbit}
        onManual={onRecoveryManual}
        isFitbitLinked={fitbitAuthenticated}
      />

      {/* Unlink Confirm */}
      <UnlinkConfirmModal
        visible={unlinkModalVisible}
        onCancel={() => setUnlinkModalVisible(false)}
        onConfirm={confirmUnlinkFitbit}
      />
    </div>
  );
}
