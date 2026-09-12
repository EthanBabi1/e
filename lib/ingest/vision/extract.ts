import Anthropic from "@anthropic-ai/sdk";
import { ExtractionResponseSchema, type ExtractionResponse } from "./schema";

const EXTRACTION_PROMPT = `You are extracting kart racing results from a photo, screenshot, or PDF of a results sheet.

Return ONLY valid JSON matching this exact shape, no prose, no markdown code fences:
{
  "rows": [
    {
      "position": number or null,
      "kartNumber": string or null,
      "driverName": string or null,
      "class": string or null,
      "laps": number or null,
      "bestLap": string or null,
      "totalTime": string or null,
      "gap": string or null,
      "status": "finished" | "dnf" | "dns" | "dq",
      "confidence": { "<fieldName>": number between 0 and 1 for each field you filled in }
    }
  ],
  "notes": [ "any caveat about image quality, skew, glare, multiple classes on one sheet, illegible cells, etc." ]
}

Rules:
- If the sheet has multiple classes, include all rows with their class field set — do not drop any.
- Keep time values as the raw string exactly as printed (e.g. "1:02.45" or "62.45") — do not convert them yourself.
- Mark DNF/DNS/DQ in "status" when the sheet indicates it, and leave lap/time fields null for that row if not applicable.
- Give an honest confidence score per field you extracted — low confidence for anything smudged, cut off, or ambiguous.
- If you truly cannot read the sheet at all, return {"rows": [], "notes": ["explain why"]}.`;

export class ExtractionUnavailableError extends Error {}

/**
 * Path B (section 3) — the fallback ingest path, and the primary one in
 * this build (see DATA-ACCESS.md). Never auto-publishes: the caller always
 * routes the result through the shared review screen.
 */
export async function extractResultsFromImage(params: {
  imageBase64: string[];
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
}): Promise<ExtractionResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ExtractionUnavailableError(
      "ANTHROPIC_API_KEY is not configured — photo/PDF extraction is unavailable. Use manual entry (Path D) instead."
    );
  }

  const client = new Anthropic({ apiKey });

  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = params.imageBase64.map((data) =>
    params.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: params.mediaType, data } }
  );

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [...contentBlocks, { type: "text", text: EXTRACTION_PROMPT }],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Extraction returned no text content");
  }

  const jsonText = textBlock.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(jsonText);
  return ExtractionResponseSchema.parse(parsed);
}
