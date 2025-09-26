// frontend/src/pages/publish/autos/AutosWizard.jsx
import React, { useState } from "react";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";

/** Stepper (solo estilos) */
function Stepper({ current }) {
  const steps = ["Categoría", "Ubicación", "Detalles", "Fotos", "Precio", "Revisión"];
  return (
    <div className="mb-6">
      <ol className="flex items-center w-full text-sm text-gray-600">
        {steps.map((label, i) => (
          <li key={label} className="flex-1 flex items-center">
            <div className={`flex items-center gap-2 ${i <= current ? "text-gray-900" : ""}`}>
              <div
                className={[
                  "size-7 rounded-full flex items-center justify-center border",
                  i < current
                    ? "bg-gray-900 text-white border-gray-900"
                    : i === current
                    ? "bg-white border-gray-900 text-gray-900"
                    : "bg-white border-gray-300 text-gray-400",
                ].join(" ")}
              >
                {i + 1}
              </div>
              <span className="hidden sm:block font-medium">{label}</span>
            </div>
            {i < steps.length - 1 && <div className="mx-3 h-px flex-1 bg-gray-200" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function useStepIndex(pathname) {
  if (pathname.endsWith("/autos")) return 0;
  if (pathname.includes("/ubicacion")) return 1;
  if (pathname.includes("/detalles")) return 2;
  if (pathname.includes("/fotos")) return 3;
  if (pathname.includes("/precio")) return 4;
  if (pathname.includes("/revision")) return 5;
  return 0;
}

export default function AutosWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const stepIndex = useStepIndex(location.pathname);

  // Estado compartido entre pasos
  const [category, setCategory] = useState(null);      // { slug,label,code,icon }
  const [subcategory, setSubcategory] = useState(null); // idem

  // Habilitación del botón Continuar según el paso
  const canContinue =
    stepIndex === 0 ? Boolean(category && subcategory) : true;

  // Navegación entre pasos
  function onBack() {
    if (stepIndex === 0) navigate("/publish");
    else if (stepIndex === 1) navigate("/publish/autos");
    else if (stepIndex === 2) navigate("/publish/autos/ubicacion");
    else if (stepIndex === 3) navigate("/publish/autos/detalles");
    else if (stepIndex === 4) navigate("/publish/autos/fotos");
    else if (stepIndex === 5) navigate("/publish/autos/precio");
  }

  function onContinue() {
    if (stepIndex === 0) navigate("/publish/autos/ubicacion");
    else if (stepIndex === 1) navigate("/publish/autos/detalles");
    else if (stepIndex === 2) navigate("/publish/autos/fotos");
    else if (stepIndex === 3) navigate("/publish/autos/precio");
    else if (stepIndex === 4) navigate("/publish/autos/revision");
    else if (stepIndex === 5) {
      // último paso: podrías hacer submit aquí
      // TODO: submit y redirección
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Publicar vehículo</h1>
        <Link className="text-sm text-gray-600 hover:text-gray-900" to="/publish">
          Volver
        </Link>
      </div>

      <Stepper current={stepIndex} />

      {/* Card del contenido del paso */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-4 sm:p-6">
          {/* Proveer estado a los pasos */}
          <Outlet context={{ category, setCategory, subcategory, setSubcategory }} />
        </div>

        {/* Footer de acciones */}
        <div className="px-4 sm:px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
          {/* Resumen corto en paso 1 */}
          {stepIndex === 0 ? (
            <div className="text-sm text-gray-600">
              {category ? (
                <>
                  <span className="mr-2">Categoría:</span>
                  <strong>{category.label}</strong>
                  {subcategory && (
                    <>
                      <span className="mx-2">›</span>
                      <strong>{subcategory.label}</strong>
                    </>
                  )}
                </>
              ) : (
                "Elegí una categoría y subcategoría para continuar."
              )}
            </div>
          ) : <span />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-lg border"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className={`px-4 py-2 rounded-lg border font-semibold ${canContinue ? "" : "opacity-50 cursor-not-allowed"}`}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
