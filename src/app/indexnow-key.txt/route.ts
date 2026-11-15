import { INDEXNOW_KEY } from "@/lib/indexnow";

/** The public IndexNow key file. Search engines read it to check a submission came from this site. */
export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
