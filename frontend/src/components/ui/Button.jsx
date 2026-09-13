export function Button({ children, variant = 'primary', className = '', ...props }) {
  let baseStyle = 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  let variantStyle = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500';

  if (variant === 'secondary') {
    variantStyle = 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500';
  } else if (variant === 'danger') {
    variantStyle = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
  } else if (variant === 'outline') {
    variantStyle = 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-indigo-500';
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
