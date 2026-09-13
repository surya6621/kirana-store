export function ErrorMessage({ message }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-red-700">{message || 'An error occurred.'}</p>
        </div>
      </div>
    </div>
  );
}
