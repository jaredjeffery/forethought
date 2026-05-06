// Shared URL slug helpers for stable public routes.

export function createVariableSlug(name: string, countryCode: string) {
  const base = `${name}-${countryCode}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || countryCode.toLowerCase();
}
