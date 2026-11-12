import { legacyLocationRedirect } from "@/lib/legacy-location";

/** Old-site address /recruiters-in/<location>: moved for good. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/recruiters-in/[location]">,
) {
  const { location } = await params;
  return legacyLocationRedirect(request, location, null);
}
