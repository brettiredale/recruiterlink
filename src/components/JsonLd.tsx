export type JsonLdData = Record<string, unknown> | Array<Record<string, unknown>>;

/**
 * Serialises structured data so it cannot break out of its <script> tag,
 * whatever text an agency name or answer contains.
 */
export function serialiseJsonLd(data: JsonLdData): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export type JsonLdProps = {
  /** A schema.org object (or list of objects), including "@context" and "@type". */
  data: JsonLdData;
};

/** Renders schema.org structured data as a JSON-LD script tag in the server HTML. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }}
    />
  );
}
