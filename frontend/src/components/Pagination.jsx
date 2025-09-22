export default function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={prev} disabled={page <= 1}
        className="px-3 py-1 rounded border disabled:opacity-50">‹</button>
      <span className="text-sm">Página {page} de {totalPages}</span>
      <button onClick={next} disabled={page >= totalPages}
        className="px-3 py-1 rounded border disabled:opacity-50">›</button>
    </div>
  );
}
