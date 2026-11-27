/** „512 B”, „12,4 kB”, „3,1 MB” – po polsku (przecinek). */
export function formatBytes(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "kB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 || v >= 100 ? 0 : 1;
  return `${v.toFixed(digits).replace(".", ",")} ${units[i]}`;
}
