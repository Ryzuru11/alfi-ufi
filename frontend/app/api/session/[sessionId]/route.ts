import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessionStore";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({
    sessionId: session.sessionId,
    tokensRemaining: session.tokensRemaining,
    photosUploaded: session.photosUploaded,
  });
}
