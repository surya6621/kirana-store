import { useState } from 'react';
import { Package } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

export function ProductImage({ src, alt = 'Product', size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  const sizes = {
    sm: 'h-10 w-10 rounded-lg',
    md: 'h-14 w-14 rounded-xl',
    lg: 'h-28 w-28 rounded-2xl',
  };

  const imageUrl = resolveImageUrl(src);
  const showPlaceholder = !imageUrl || failed;

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-emerald-50 text-emerald-700 ${sizes[size] || sizes.md} ${className}`}>
      {showPlaceholder ? (
        <Package className={size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'} aria-hidden="true" />
      ) : (
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
