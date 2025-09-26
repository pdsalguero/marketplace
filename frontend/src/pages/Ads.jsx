import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Container from "../components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

export default function Ads() {
  const [params] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const qs = params.toString();
    fetch("/api/ads?" + qs)
      .then((r) => r.json())
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch(() => {});
  }, [params]);

  return (
    <Container className="py-10 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Anuncios</h1>
        <div className="text-sm text-gray-500">{total} resultados</div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((ad) => (
          <Card key={ad.id} className="overflow-hidden hover:shadow-md transition">
            <Link to={`/ads/${ad.id}`}>
              <div className="aspect-[4/3] bg-gray-100">
                {/* Aquí podrías poner una imagen si tienes ad.image */}
              </div>
            </Link>
            <CardHeader className="pt-3 px-4">
              <CardTitle className="text-base font-medium text-gray-900 line-clamp-2">{ad.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-gray-900 font-bold text-lg">${ad.price}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(ad.createdAt).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
