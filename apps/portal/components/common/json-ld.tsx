import { serializeJsonLd, type JsonLd as JsonLdData } from "@/lib/seo/json-ld";

/**
 * The only allowed use of `dangerouslySetInnerHTML` in the app (ADR-008 §7.3):
 * structured data, serialised with `<`/`>`/`&` escaped.
 */
export function JsonLd({ data, id }: { data: JsonLdData | JsonLdData[]; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD only, escaped above.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
