// app/api/auth/verify/fitbit/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.json(
        { error: "Missing Fitbit authorization code" },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: "Missing state parameter for CSRF protection" },
        { status: 400 }
      );
    }

    
    const redirectUrl = new URL("/fitbit/complete", req.url); 
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", state);

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Fitbit callback error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
