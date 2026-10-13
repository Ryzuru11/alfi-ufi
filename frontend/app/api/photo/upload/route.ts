import { NextRequest, NextResponse } from "next/server";
import { uploadToDrive } from "@/lib/driveService";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const tokenCount = formData.get("tokenCount") as string; // jumlah foto yang sudah diupload

    if (!file) {
      return NextResponse.json({ error: "File foto tidak ditemukan" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Hanya file gambar yang diizinkan" }, { status: 400 });
    }

    // Validasi ukuran max 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran foto terlalu besar (max 15MB)" }, { status: 400 });
    }

    // Konversi ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Nama file dengan timestamp + nomor urut
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const count = tokenCount ? `_no${tokenCount}` : "";
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `foto_${timestamp}${count}_${Math.random().toString(36).substr(2, 4)}.${ext}`;

    // Upload ke Google Drive
    const fileInfo = await uploadToDrive(buffer, fileName, file.type);

    return NextResponse.json({
      success: true,
      message: "Foto berhasil dikirim!",
      file: { name: fileInfo.name, webViewLink: fileInfo.webViewLink },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
    console.error("Upload error:", msg);
    return NextResponse.json({ error: "Gagal mengirim foto: " + msg }, { status: 500 });
  }
}
