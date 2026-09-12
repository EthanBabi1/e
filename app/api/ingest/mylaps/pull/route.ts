import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pullMylapsResultsForConfirmation, MylapsImportDisabledError } from "@/lib/ingest/mylaps/sync";

const BodySchema = z.object({ racerId: z.string(), transponderNumber: z.string() });

/** Path A (section 3, flagged off by default — see DATA-ACCESS.md). */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());
  try {
    const result = await pullMylapsResultsForConfirmation(body.racerId, body.transponderNumber);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MylapsImportDisabledError) {
      return NextResponse.json({ error: err.message, disabled: true }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 502 });
  }
}
