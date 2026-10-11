import { NextRequest, NextResponse } from "next/server";
import { getFilesFromDrive } from "@/lib/driveService";

export async function GET(req: NextRequest) {
  const password = req.headers.get("password");
  const adminPassword = process.env.ADMIN_PASSWORD || "alfiufi2025";

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  try {
    const files = await getFilesFromDrive();
    return NextResponse.json({ files, total: files.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal ambil foto";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
