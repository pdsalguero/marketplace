import React from "react";
import { Outlet, useLocation, Link } from "react-router-dom";

/** Stepper moderno (solo estilos) */
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
                  i < current ? "bg-gray-900 text-white border-gray-900" : i === current ? "bg-white border-gray-900 text-gray-900" : "bg-white border-gray-300 text-gray-400",
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
  const stepIndex = useStepIndex(useLocation().pathname);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Publicar vehículo</h1>
        <Link className="text-sm text-gray-600 hover:text-gray-900" to="/publish">
          Volver
        </Link>
      </div>

      <Stepper current={stepIndex} />

      {/* Page card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
