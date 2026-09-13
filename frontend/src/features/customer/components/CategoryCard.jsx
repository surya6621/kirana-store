import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export function CategoryCard({ category }) {
  return (
    <Link
      to={`/store/products?category=${encodeURIComponent(category.id)}`}
      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col items-center text-center group"
    >
      <div className="w-14 h-14 bg-indigo-50 group-hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:text-white transition-colors mb-3">
        <Package className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
        {category.name}
      </h3>
      {category.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{category.description}</p>
      )}
    </Link>
  );
}
