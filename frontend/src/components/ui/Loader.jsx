import { Loader2 } from 'lucide-react';

export function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="mt-2 text-sm text-gray-600">{text}</p>
    </div>
  );
}
