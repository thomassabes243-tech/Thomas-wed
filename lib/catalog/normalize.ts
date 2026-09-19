export function normalizeCatalogSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildProductSearchText(values: Array<string | null | undefined>) {
  return normalizeCatalogSearch(values.filter(Boolean).join(" "));
}
