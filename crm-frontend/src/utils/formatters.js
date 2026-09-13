export function toRial(n) {
  if (!n) return '۰';
  return Number(n).toLocaleString('fa-IR');
}

export function toPersianNum(n) {
  if (n === null || n === undefined) return '—';
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
