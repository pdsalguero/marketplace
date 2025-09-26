// frontend/src/pages/publish/autos/ReviewStep.jsx
import { useOutletContext, useNavigate } from "react-router-dom";
import { useMemo } from "react";

export default function ReviewStep() {
  // Estado compartido que definiste en AutosWizard (category/subcategory)
  const { category, subcategory } = useOutletContext();
  const navigate = useNavigate();

  // Texto “Autos > Autos Usados”, etc.
  const categoryPath = useMemo(() => {
    if (!category) return "—";
    if (!subcategory) return category.label;
    return `${category.label} > ${subcategory.label}`;
  }, [category, subcategory]);

  const canPublish = Boolean(category && subcategory);

  function handlePublish() {
    if (!canPublish) return;
    // TODO: aquí haz tu POST real; por ahora solo demo
    // await fetch(`${API_BASE}/api/ads`, { method:'POST', body: JSON.stringify({...}) })
    alert(`Publicando: ${categoryPath}`);
    // Redirige si quieres
    // navigate("/ads/123");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Revisión</h2>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500 mb-1">Categoría</div>
          <div className="font-medium">
            {category ? (
              <span>{categoryPath}</span>
            ) : (
              <span className="text-gray-500">No seleccionada</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border"
          onClick={() => navigate("/publish/autos/precio")}
        >
          Volver
        </button>

        <button
          type="button"
          className={`px-4 py-2 rounded-lg border font-semibold ${canPublish ? "" : "opacity-50 cursor-not-allowed"}`}
          disabled={!canPublish}
          onClick={handlePublish}
        >
          Publicar
        </button>
      </div>

      {!canPublish && (
        <p className="text-sm text-gray-500">
          Para publicar, primero elegí <strong>categoría</strong> y <strong>subcategoría</strong> en el paso 1.
        </p>
      )}
    </div>
  );
}
