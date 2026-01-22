import { NextResponse } from "next/server";
import { listQueuedEmails } from "@/survey/repo";

export async function GET() {
  const rows = listQueuedEmails();
  return NextResponse.json(rows);
}
