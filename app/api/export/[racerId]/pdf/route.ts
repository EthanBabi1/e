import { NextRequest, NextResponse } from "next/server";
import { generateResultsPdf } from "@/lib/export/pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ racerId: string }> }) {
  const { racerId } = await params;
  const pdfBytes = await generateResultsPdf(racerId);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="racer-${racerId}-results.pdf"`,
    },
  });
}
