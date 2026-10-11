import { NextRequest, NextResponse } from "next/server";
import { getSession, useToken, recordUpload } from "@/lib/sessionStore";
import { uploadToDrive } from "@/lib/driveService";

export const maxDuration = 60; // 60 detik timeout untuk upload

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const file = formData.get("photo") as File | null;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId diperlukan" }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan. Silakan scan QR ulang." },
        { status: 404 }
      );
    }

    if (session.tokensRemaining <= 0) {
      return NextResponse.json({ error: "Token foto kamu sudah habis!" }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "File foto tidak ditemukan" }, { status: 400 });
    }

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Hanya file gambar yang diizinkan" }, { status: 400 });
    }

    // Kurangi token
    const tokenUsed = useToken(sessionId);
    if (!tokenUsed) {
      return NextResponse.json({ error: "Token foto kamu sudah habis!" }, { status: 403 });
    }

    // Konversi File ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Nama file dengan timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, "_").replace(/:/g, "-").replace(/\..+/, "");
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `foto_${timestamp}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

    // Upload ke Google Drive
    const fileInfo = await uploadToDrive(buffer, fileName, file.type);

    // Catat log
    recordUpload(sessionId, {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      webViewLink: fileInfo.webViewLink,
    });

    const updatedSession = getSession(sessionId);

    return NextResponse.json({
      success: true,
      message: "Foto berhasil dikirim!",
      tokensRemaining: updatedSession?.tokensRemaining ?? 0,
      photosUploaded: updatedSession?.photosUploaded ?? 1,
      file: { name: fileInfo.name, webViewLink: fileInfo.webViewLink },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
    console.error("Upload error:", msg);
    return NextResponse.json({ error: "Gagal mengirim foto: " + msg }, { status: 500 });
  }
}
