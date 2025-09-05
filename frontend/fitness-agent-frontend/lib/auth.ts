import { cookies } from "next/headers";

export const TOKEN_COOKIE_NAME = "fitness_token";

// Read JWT cookie (server-side)
export async function getTokenCookie() {
  const cookieStore = await cookies(); 
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value || null;
}
