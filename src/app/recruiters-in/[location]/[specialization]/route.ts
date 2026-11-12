import { legacyLocationRedirect } from "@/lib/legacy-location";

/** Old-site address /recruiters-in/<location>/<specialization>: moved for good. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/recruiters-in/[location]/[specialization]">,
) {
  const { location, specialization } = await params;
  return legacyLocationRedirect(request, location, specialization);
}
