import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function ReviewStep() {
  const navigate = useNavigate();
  const draft = useMemo(() => JSON.parse(sessionStorage.getItem("publishDraft") || "{}"), []);

  const submit = async () => {
    const payload = {
      title: draft?.details?.title ?? "Aviso sin título",
      description: draft?.details?.description ?? "",
      price: draft?.price ?? 0,
      category: "AUTOS",
      subcategory: draft?.subcategory,
      brand: draft?.details?.brand,
      model: draft?.details?.model,
      year: draft?.details?.year,
      mileage: draft?.details?.mileage,
      transmission: draft?.details?.transmission,
      fuel: draft?.details?.fuel,
      imageKeys: draft?.photos ?? [],
      location: draft?.location ? `${draft.location.province}, ${draft.location.city}` : undefined,
    };

    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("No se pudo publicar el aviso");
      return;
    }

    // Limpiamos el borrador y redirigimos a la página de elegir categoría
    sessionStorage.removeItem("publishDraft");
    // Opcional: podés pasar un flag para mostrar un banner de éxito en /publish
    navigate("/publish?published=1");
  };

  const Row = ({ k, v }) => (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-gray-900">{v}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Revisá tu publicación</h3>
        <div className="space-y-2">
          <Row k="Categoría" v={`Vehículos / ${draft?.subcategory || "-"}`} />
          <Row k="Ubicación" v={`${draft?.location?.province || "-"} - ${draft?.location?.city || "-"}`} />
          <Row k="Título" v={draft?.details?.title || "-"} />
          <Row k="Marca/Modelo" v={`${draft?.details?.brand || "-"} ${draft?.details?.model || ""}`} />
          <Row k="Año / KMs" v={`${draft?.details?.year || "-"} / ${draft?.details?.mileage || "-"}`} />
          <Row k="Transmisión / Combustible" v={`${draft?.details?.transmission || "-"} / ${draft?.details?.fuel || "-"}`} />
          <Row k="Precio" v={`$ ${draft?.price || "-"}`} />
          <Row k="Fotos" v={`${draft?.photos?.length || 0}`} />
        </div>
        {draft?.details?.description && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
            {draft.details.description}
          </div>
        )}
      </div>

      <div className="flex justify-between md:justify-end gap-3">
        <button type="button" className="px-4 py-2 rounded-lg border border-gray-300" onClick={() => navigate(-1)}>
          Atrás
        </button>
        <button type="button" className="px-4 py-2 rounded-lg text-white bg-gray-900 hover:bg-black" onClick={submit}>
          Publicar
        </button>
      </div>
    </div>
  );
}
