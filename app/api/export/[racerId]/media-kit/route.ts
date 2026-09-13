import { NextRequest, NextResponse } from "next/server";
import { generateMediaKitPdf } from "@/lib/export/mediaKit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ racerId: string }> }) {
  const { racerId } = await params;
  const pdfBytes = await generateMediaKitPdf(racerId);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="media-kit.pdf"`,
    },
  });
}
