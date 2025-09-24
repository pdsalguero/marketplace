import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Container from "../components/ui/Container";
import { Card, CardContent } from "../components/ui/Card";

export default function AdDetail() {
  const { id } = useParams();
  const [ad, setAd] = useState(null);

  useEffect(() => {
    fetch(`/api/ads/${id}`).then((r) => r.json()).then(setAd).catch(() => {});
  }, [id]);

  if (!ad) {
    return (
      <Container className="py-10">
        <div className="text-center text-gray-500">Cargando…</div>
      </Container>
    );
  }

  return (
    <Container className="py-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Galería */}
        <Card className="lg:col-span-7 overflow-hidden">
          <div className="aspect-[4/3] bg-gray-100" />
          {/* thumbs si querés */}
        </Card>

        {/* Datos */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardContent className="space-y-2">
              <h1 className="text-2xl font-semibold">{ad.title}</h1>
              <div className="text-2xl font-bold">${ad.price}</div>
              <div className="text-sm text-gray-500">{ad.location || "Sin ubicación"}</div>
              <div className="text-sm text-gray-500">{new Date(ad.createdAt).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info k="Categoría" v={ad.category} />
              {ad.subcategory && <Info k="Subcategoría" v={ad.subcategory} />}
              {ad.brand && <Info k="Marca" v={ad.brand} />}
              {ad.model && <Info k="Modelo" v={ad.model} />}
              {ad.year && <Info k="Año" v={ad.year} />}
              {ad.mileage && <Info k="KMs" v={ad.mileage} />}
              {ad.transmission && <Info k="Transmisión" v={ad.transmission} />}
              {ad.fuel && <Info k="Combustible" v={ad.fuel} />}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">Descripción</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{ad.description}</p>
        </CardContent>
      </Card>
    </Container>
  );
}

function Info({ k, v }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
