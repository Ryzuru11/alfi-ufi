import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/sessionStore";

export async function GET(req: NextRequest) {
  const password = req.headers.get("password");
  const adminPassword = process.env.ADMIN_PASSWORD || "alfiufi2025";

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  return NextResponse.json(getStats());
}
