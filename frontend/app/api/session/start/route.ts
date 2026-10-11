import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createSession } from "@/lib/sessionStore";

export async function POST() {
  const sessionId = uuidv4();
  const session = createSession(sessionId);
  return NextResponse.json({
    sessionId: session.sessionId,
    tokensRemaining: session.tokensRemaining,
    message: `Selamat datang! Kamu punya ${session.tokensRemaining} kesempatan foto.`,
  });
}
