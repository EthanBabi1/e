import { NextResponse } from "next/server";
import { FEATURE_FLAGS } from "@/lib/config";

export async function GET() {
  return NextResponse.json(FEATURE_FLAGS);
}
