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
  avatar?: ReactNode;
}) {
  // Split message into text and URLs
  const formattedMessage = isUser
    ? [message]
    : message.split(/(https?:\/\/[^\s,!?;:]+)/g).map((part, i) =>
        /https?:\/\/[^\s,!?;:]+/.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            {part}
          </a>
        ) : (
          part
        )
      );

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
        {formattedMessage}
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
            This app uses internal agents (Trainer, Nutrition, Recovery) to
            generate personalized responses. By continuing, you agree to let
            these agents read your input messages so they can collaborate and
            respond.
          </p>
          <p>
            We integrate with Fitbit to generate personalized recovery
            suggestions. If linked, agents may read your Fitbit data (activity,
            sleep, heart rate, profile) strictly for insights. Your data will
            not be modified.
          </p>
          <p className="text-xs text-gray-500">
            Access is protected with Descope-issued scoped tokens. You can link
            or unlink Fitbit anytime using the badge in the header.
          </p>
        </div>
        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={onAccept}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            I Agree & Continue
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
  const [mode, setMode] = useState<"fitbit" | "manual">(
    isFitbitLinked ? "fitbit" : "manual"
  );

  useEffect(() => {
    if (!visible) {
      setSleepHours("");
      setProteinGrams("");
      setMode(isFitbitLinked ? "fitbit" : "manual");
    }
  }, [visible, isFitbitLinked]);

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
            onClick={() => setMode("fitbit")}
            className={`flex-1 px-4 py-3 rounded-lg border ${
              mode === "fitbit"
                ? "border-green-500 bg-green-50"
                : "border-gray-300"
            }`}
          >
            Use Fitbit {isFitbitLinked ? "(linked)" : "(not linked)"}
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 px-4 py-3 rounded-lg border ${
              mode === "manual"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
          >
            Manual entry
          </button>
        </div>

        {mode === "manual" && (
          <>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">
                Sleep hours (optional - How many hours are you aiming to sleep?)
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
                Protein (grams) (optional - How many grams can you hit in a
                day?)
              </label>
              <input
                value={proteinGrams}
                onChange={(e) => setProteinGrams(e.target.value)}
                placeholder="e.g. 120"
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (mode === "fitbit") onUseFitbit();
              else onManual(sleepHours, proteinGrams);
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            Submit
          </button>
          <button
            onClick={() => {
              onClose();
              // Execute pending query naturally
              onUseFitbit();
            }}
            className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800"
          >
            Skip
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
type ChatMessage = { text: string; user?: boolean };
type ManualData = { sleepHours?: number; proteinIntake?: number };

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("chat_messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [agentConsentGranted, setAgentConsentGranted] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("agent_consent_granted") === "true"
  );
  const [fitbitToken, setFitbitToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("fitbit_token") : null
  );
  const [fitbitAuthenticated, setFitbitAuthenticated] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("fitbit_authenticated") === "true"
  );
  const [fitbitWelcomeShown, setFitbitWelcomeShown] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("fitbit_welcome_shown") === "true"
  );
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [pendingRecoveryMessage, setPendingRecoveryMessage] = useState<
    string | null
  >(null);
  const [unlinkModalVisible, setUnlinkModalVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agentAvatar = (
    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
      A
    </div>
  );

  const presetMessages = [
    "Hello! What's this application about?",
    "Suggest some back workouts",
    "Give me a diet plan for muscle gain for skinny people",
    "I want to grow my arms. Suggest a training plan and a diet plan for the same",
    "How is my recovery today?",
    "How should I recover after a leg workout?",
  ];

  useEffect(() => {
    localStorage.setItem("chat_messages", JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(
      "agent_consent_granted",
      agentConsentGranted ? "true" : "false"
    );
  }, [agentConsentGranted]);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("descope_jwt"))
      router.replace("/");
  }, [router]);

  useEffect(() => {
    if (!agentConsentGranted) setShowConsent(true);
  }, [agentConsentGranted]);

  /* ---------------------------- Fitbit OAuth --------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState = localStorage.getItem("fitbit_oauth_state");
    if (!code) return;
    if (storedState && state && state !== storedState) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    const codeVerifier = localStorage.getItem("fitbit_code_verifier");
    if (!codeVerifier) {
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
          console.log("Fitbit data fetched:", data); // log to console

          if (!fitbitWelcomeShown) {
            setMessages((m) => [
              ...m,
              {
                text: "Fitbit integrated. You can ask queries related to Fitbit or enter manually.",
                user: false,
              },
            ]);
            localStorage.setItem("fitbit_welcome_shown", "true");
            setFitbitWelcomeShown(true);
          }

          if (pendingRecoveryMessage) {
            setRecoveryModalVisible(false);
            handleSend(pendingRecoveryMessage);
            setPendingRecoveryMessage(null);
          }
        } else throw new Error("Token exchange failed");
      } catch {
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
  }, []);

  async function startFitbitOAuth() {
    try {
      const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID!;
      const redirectUri = `${window.location.origin}/api/auth/verify/fitbit/callback`;
      const scope = "activity heartrate sleep profile";
      const array = new Uint8Array(64);
      crypto.getRandomValues(array);
      const codeVerifier = btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      localStorage.setItem("fitbit_code_verifier", codeVerifier);
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(codeVerifier)
      );
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const state = crypto.randomUUID();
      localStorage.setItem("fitbit_oauth_state", state);
      window.location.href = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${encodeURIComponent(
        scope
      )}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;
    } catch {
      setMessages((m) => [
        ...m,
        {
          text: "Failed to start Fitbit link. You can proceed with manual logs.",
          user: false,
        },
      ]);
    }
  }

  function handleLogout() {
    [
      "descope_jwt",
      "agent_consent_granted",
      "fitbit_token",
      "fitbit_tokens",
      "fitbit_authenticated",
      "fitbit_oauth_state",
      "fitbit_code_verifier",
      "fitbit_welcome_shown",
    ].forEach((k) => localStorage.removeItem(k));
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
        text: "Consent granted. You can link or unlink Fitbit anytime using the badge beside Logout.",
        user: false,
      },
    ]);
  }

  function looksLikeRecoveryQuery(text: string) {
    const lower = text.toLowerCase();
    return [
      "recovery",
      "recover",
      "how is my recovery",
      "how should i recover",
      "recover after",
      "recovery-based",
      "sleep",
      "rest",
      "recovery score",
    ].some((k) => lower.includes(k));
  }

  async function handleSend(
    msgOverride?: string,
    manualData?: ManualData,
    skipRecoveryCheck = false
  ) {
    const messageToSend = (msgOverride ?? input).trim();
    if (!messageToSend) return;

    // Append user message immediately
    setMessages((m) => [...m, { text: messageToSend, user: true }]);
    if (!msgOverride) setInput("");

    // Show manual data if provided
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

    // ---------------- Recovery modal logic ----------------
    // Only trigger if:
    // - looks like a recovery query
    // - no manual data
    // - not already skipping modal check
    // - no pending message to avoid double modal
    if (
      looksLikeRecoveryQuery(messageToSend) &&
      !manualData &&
      !skipRecoveryCheck &&
      !pendingRecoveryMessage
    ) {
      setPendingRecoveryMessage(messageToSend);
      setRecoveryModalVisible(true);
      return; // exit early, no query sent yet
    }

    // Clear pendingRecoveryMessage if this query was pending
    if (pendingRecoveryMessage === messageToSend) {
      setPendingRecoveryMessage(null);
    }

    // ---------------- Fitbit payload logic ----------------
    // Only fetch Fitbit data if authenticated AND skipping modal check
    let fitbitPayload: any = null;
    if (fitbitAuthenticated && fitbitToken && skipRecoveryCheck) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/fitbit/data`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("descope_jwt")}`,
            },
          }
        );
        const data = await res.json();

        if (!data || Object.keys(data).length === 0) {
          setMessages((m) => [
            ...m,
            {
              text: "No Fitbit data found. Please enter manually or link your Fitbit account.",
              user: false,
            },
          ]);
          return;
        }

        fitbitPayload = data;
        console.log("Fitbit data fetched:", fitbitPayload);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            text: "Error fetching your Fitbit data. Please try again later or enter manually.",
            user: false,
          },
        ]);
        return;
      }
    }

    // ---------------- Send query to agent ----------------
    try {
      setLoading(true);
      setMessages((m) => [...m, { text: "thinking", user: false }]);

      const jwt = localStorage.getItem("descope_jwt");
      if (!jwt) throw new Error("No session");

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
            fitbit_token: fitbitPayload ? fitbitToken : null,
            fitbit_data: fitbitPayload ?? null,
            manual_data: manual_payload,
          }),
        }
      );

      const data = await response.json();
      setMessages((m) => m.filter((msg) => msg.text !== "thinking"));

      // Handle consent required separately
      if (data.consent_required) {
        setMessages((m) => [
          ...m,
          {
            text: data.message || "Consent is required to proceed.",
            user: false,
          },
        ]);
        return;
      }

      // Append agent response
      if (data.message) {
        setMessages((m) => [...m, { text: data.message.trim(), user: false }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            text: "Couldn't understand query or no response from agents.",
            user: false,
          },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m.filter((msg) => msg.text !== "thinking"),
        { text: "Error contacting server.", user: false },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onRecoveryUseFitbit() {
    setRecoveryModalVisible(false);
    const pending = pendingRecoveryMessage;
    setPendingRecoveryMessage(null);
    if (!pending) return;

    if (fitbitAuthenticated && fitbitToken) {
      // Fetch Fitbit data first and send query once
      (async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/fitbit/data`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("descope_jwt")}`,
              },
            }
          );
          const data = await res.json();

          if (!data || Object.keys(data).length === 0) {
            setMessages((m) => [
              ...m,
              {
                text: "No Fitbit data found. Please enter manually or check your Fitbit connection.",
                user: false,
              },
            ]);
            return;
          }

          console.log("Fitbit data fetched:", data);
          // Send query with skipRecoveryCheck = true to prevent modal from reopening
          handleSend(pending, undefined, true);
        } catch (err) {
          setMessages((m) => [
            ...m,
            {
              text: "Error fetching your Fitbit data. Please try again later or enter manually.",
              user: false,
            },
          ]);
        }
      })();
    } else {
      setMessages((m) => [
        ...m,
        {
          text: "Fitbit not linked. Please link your Fitbit account using the badge beside Logout, or use manual entry.",
          user: false,
        },
      ]);
    }
  }

  function onRecoveryManual(sleepHours: string, proteinGrams: string) {
    setRecoveryModalVisible(false);
    const pending = pendingRecoveryMessage;
    setPendingRecoveryMessage(null);
    if (!pending) return;

    // Send query with manual data and skipRecoveryCheck = true
    handleSend(
      pending,
      {
        sleepHours: sleepHours ? Number(sleepHours) : undefined,
        proteinIntake: proteinGrams ? Number(proteinGrams) : undefined,
      },
      true
    );
  }
  function onFitbitBadgeClick() {
    if (fitbitAuthenticated) setUnlinkModalVisible(true);
    else startFitbitOAuth();
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

  return (
    <div className="relative flex w-full max-w-7xl mx-auto h-[calc(100vh-122px)] mt-2 bg-white rounded-xl shadow-xl overflow-hidden">
      <section className="flex-1 flex flex-col h-full relative">
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

        <div className="flex-1 overflow-y-auto px-8 pt-6 pb-4 flex flex-col gap-4">
          {messages.map((msg, i) =>
            msg.text === "thinking" ? (
              <AgentThinkingBubble key={i} avatar={agentAvatar} />
            ) : (
              <ChatBubble
                key={i}
                message={msg.text}
                isUser={!!msg.user}
                avatar={agentAvatar}
              />
            )
          )}
          <div ref={scrollRef} />
        </div>

        <div className="px-8 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-gray-600 text-sm font-semibold">
              Quick Questions:
            </span>
            <button
              onClick={() => {
                localStorage.getItem("descope_jwt") && setMessages([]);
                setInput("");
              }}
              className="text-blue-600 underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-3 px-8 pb-4">
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

      {showConsent && <ConsentModal onAccept={acceptConsent} />}
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
      <UnlinkConfirmModal
        visible={unlinkModalVisible}
        onCancel={() => setUnlinkModalVisible(false)}
        onConfirm={confirmUnlinkFitbit}
      />
    </div>
  );
}
