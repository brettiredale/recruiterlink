import type { AgencySummary } from "@/lib/data";
import { cityLabel } from "@/lib/regions";
import { agencyPath } from "@/lib/routes";
import { displaySpecialisms } from "@/lib/specialisms";
import type { CardSource } from "@/lib/card-events";
import { AgencyCard, AgencyGrid, type AgencyGridProps } from "./AgencyCard";
import { TrackCards } from "./TrackCards";

/** The props an AgencyCard needs, from an agency as the data layer returns it. */
export function agencyCardProps(agency: AgencySummary) {
  return {
    name: agency.name,
    agencyId: agency.id,
    href: agencyPath(agency.slug),
    city: agency.city ? cityLabel(agency.city) : null,
    country: agency.country.name,
    logoFile: agency.logoPath,
    // Generic specialisms are only shown when an agency has nothing else.
    specialisms: displaySpecialisms(agency.specialisms).map((item) => item.name),
    premium: agency.plan === "premium",
  };
}

export type AgencyListProps = {
  agencies: AgencySummary[];
  headingLevel?: "h2" | "h3" | "h4";
  minCardWidth?: AgencyGridProps["minCardWidth"];
  /** Count the cards' views and clicks under this place in the admin stats. */
  trackAs?: CardSource;
  className?: string;
};

/** A grid of agency cards. Renders nothing when the list is empty. */
export function AgencyList({
  agencies,
  headingLevel = "h3",
  minCardWidth,
  trackAs,
  className,
}: AgencyListProps) {
  if (agencies.length === 0) return null;
  const grid = (
    <AgencyGrid minCardWidth={minCardWidth} className={className}>
      {agencies.map((agency) => (
        <AgencyCard key={agency.id} headingLevel={headingLevel} {...agencyCardProps(agency)} />
      ))}
    </AgencyGrid>
  );
  return trackAs ? <TrackCards source={trackAs}>{grid}</TrackCards> : grid;
}
