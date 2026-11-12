import type { AgencySummary } from "@/lib/data";
import { agencyPath } from "@/lib/routes";
import { displaySpecialisms } from "@/lib/specialisms";
import { AgencyCard, AgencyGrid, type AgencyGridProps } from "./AgencyCard";

/** The props an AgencyCard needs, from an agency as the data layer returns it. */
export function agencyCardProps(agency: AgencySummary) {
  return {
    name: agency.name,
    href: agencyPath(agency.slug),
    city: agency.city?.name ?? null,
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
  className?: string;
};

/** A grid of agency cards. Renders nothing when the list is empty. */
export function AgencyList({
  agencies,
  headingLevel = "h3",
  minCardWidth,
  className,
}: AgencyListProps) {
  if (agencies.length === 0) return null;
  return (
    <AgencyGrid minCardWidth={minCardWidth} className={className}>
      {agencies.map((agency) => (
        <AgencyCard key={agency.id} headingLevel={headingLevel} {...agencyCardProps(agency)} />
      ))}
    </AgencyGrid>
  );
}
