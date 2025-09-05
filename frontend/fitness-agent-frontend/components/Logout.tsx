"use client";

import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();

  const handleLogout = () => {
    // Remove JWT token
    localStorage.removeItem("descope_jwt");

    // Dispatch storage event to notify other components (like Header)
    window.dispatchEvent(new Event("storage"));

    // Redirect to home
    router.replace("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
    >
      Logout
    </button>
  );
}
