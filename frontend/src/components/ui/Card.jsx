export function Card({ children, className = '', ...props }) {
  return (
    <div className={`surface rounded-2xl p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
