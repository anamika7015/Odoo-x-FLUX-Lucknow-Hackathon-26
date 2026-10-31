export function reportDateParams(range, customFrom, customTo, now = new Date()) {
  let from;
  let to = new Date(now);
  if (range === 'today') from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  else if (range === '7d') from = new Date(now.getTime() - 6 * 86_400_000);
  else if (range === '30d') from = new Date(now.getTime() - 29 * 86_400_000);
  else if (range === 'thisMonth') from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  else if (range === 'lastMonth') {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
  } else if (range === 'custom' && customFrom && customTo) {
    from = new Date(`${customFrom}T00:00:00.000Z`);
    to = new Date(`${customTo}T23:59:59.999Z`);
  }
  return from && to ? { from: from.toISOString(), to: to.toISOString() } : {};
}

export function formatCurrencyBuckets(buckets = []) {
  if (!buckets.length) return '—';
  return buckets.map(({ currency, amount }) => `${currency} ${new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100)}`).join(' · ');
}
