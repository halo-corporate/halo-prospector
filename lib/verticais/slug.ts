/**
 * Sanitiza um label livre em um slug snake_case válido pro banco.
 * Helper sync, separado das Server Actions.
 */
export function slugifyVertical(input: string): string {
  const noAccents = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let s = noAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(s)) s = "v_" + s;
  return s.slice(0, 40);
}
