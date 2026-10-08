// Pure, dependency-free validation so it can be tested independently.
// Cookie-bearing mutation endpoints only accept requests from their own origin.
export function isTrustedCatalogMutationOrigin(
  providedOrigin: string | null,
  expectedOrigin: string,
): boolean {
  if (!providedOrigin || providedOrigin.length > 2048) return false;
  try {
    const provided = new URL(providedOrigin);
    const expected = new URL(expectedOrigin);
    return (provided.protocol === "https:" || provided.hostname === "localhost") &&
      provided.origin === expected.origin &&
      providedOrigin === provided.origin;
  } catch {
    return false;
  }
}
