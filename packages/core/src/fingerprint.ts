export function fingerprint(company: string, title: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(company)}::${norm(title)}`;
}
