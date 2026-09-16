export function Button({ children, variant = 'primary', className = '', ...props }) {
  let baseStyle = 'min-h-11 px-4 py-2.5 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  let variantStyle = 'bg-[var(--brand-700)] text-white hover:bg-[var(--brand-900)] focus:ring-emerald-500';

  if (variant === 'secondary') {
    variantStyle = 'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400';
  } else if (variant === 'danger') {
    variantStyle = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
  } else if (variant === 'outline') {
    variantStyle = 'border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-emerald-500';
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
