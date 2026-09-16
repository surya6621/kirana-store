export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatStockQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return '0';
  return quantity.toLocaleString('en-IN', {
    maximumFractionDigits: 3,
    useGrouping: false,
  });
}

export function formatStockWithUnit(value, unit) {
  return `${formatStockQuantity(value)} ${unit || 'units'}`;
}

export function stockStatus(stock, minimum) {
  const current = Number(stock) || 0;
  const threshold = Number(minimum) || 0;
  if (current <= 0) return { label: 'Out of stock', tone: 'danger' };
  if (current <= threshold) return { label: 'Low stock', tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}
