/** 
 * Middleware: BigInt → string در JSON response 
 * Prisma BigInt در JSON.stringify خطا می‌دهد 
 */
function bigintMiddleware(_req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    const safeData = JSON.parse(JSON.stringify(data, (_key, value) => (
      typeof value === 'bigint' ? value.toString() : value
    )));
    return originalJson(safeData);
  };
  next();
}

/** Parse string → BigInt for Prisma query input */
function parseBigIntFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  const parsed = { ...obj };
  for (const f of fields) {
    if (parsed[f] === undefined || parsed[f] === null) continue;
    const raw = typeof parsed[f] === 'string' ? parsed[f].replace(/[,_\s]/g, '') : parsed[f];
    if ((typeof raw === 'string' && !/^-?\d+$/.test(raw)) ||
        (typeof raw === 'number' && (!Number.isSafeInteger(raw) || !Number.isFinite(raw)))) {
      throw new TypeError(`فیلد ${f} باید یک عدد صحیح معتبر باشد`);
    }
    parsed[f] = BigInt(raw);
  }
  return parsed;
}

module.exports = { bigintMiddleware, parseBigIntFields };
