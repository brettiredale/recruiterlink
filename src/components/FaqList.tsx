import { cx } from "./cx";
import { JsonLd } from "./JsonLd";

export type FaqItem = {
  question: string;
  /** Plain text. Shown on the page and used in the structured data. */
  answer: string;
};

export type FaqListProps = {
  items: FaqItem[];
  /** Heading level for each question. */
  headingLevel?: "h2" | "h3";
  /** Set false to leave out the structured data (only one FAQPage per page). */
  jsonLd?: boolean;
  className?: string;
};

/** Builds the schema.org FAQPage for a list of questions and answers. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * Questions and answers, all visible in the page (nothing hidden behind a
 * click), with schema.org FAQPage structured data.
 */
export function FaqList({
  items,
  headingLevel: Heading = "h3",
  jsonLd = true,
  className,
}: FaqListProps) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={item.question}
          className={cx(
            "py-[22px]",
            index === 0 ? "border-t-[1.5px] border-navy" : "border-t border-line-mid",
          )}
        >
          <Heading className="mb-2 font-heading text-[21px] leading-snug font-bold tracking-[-0.02em] sm:text-[22px]">
            {item.question}
          </Heading>
          <p className="text-[17px] text-muted">{item.answer}</p>
        </div>
      ))}
      {jsonLd ? <JsonLd data={faqJsonLd(items)} /> : null}
    </div>
  );
}
