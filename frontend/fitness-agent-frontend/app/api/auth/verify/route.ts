// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import sdk from "@/lib/descope";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const magicToken = body.token;

    if (!magicToken) {
      return NextResponse.json(
        { message: "Missing magic link token" },
        { status: 400 }
      );
    }

    // Verify magic link token using your lib/descope SDK
    const resp = await sdk.magicLink.verify(magicToken);

    // Access the JWT via resp.data.sessionJwt
    if (!resp?.data?.sessionJwt) {
      return NextResponse.json(
        { message: "Failed to retrieve session JWT" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionJwt: resp.data.sessionJwt });
  } catch (err: any) {
    console.error("Error verifying magic link token:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
