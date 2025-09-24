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
    <Container className="py-8 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Anuncios</h1>
        <div className="text-sm text-gray-600">{total} resultados</div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((ad) => (
          <Card key={ad.id} className="overflow-hidden">
            <Link to={`/ads/${ad.id}`}>
              <div className="aspect-[4/3] bg-gray-100" />
            </Link>
            <CardHeader className="pt-3">
              <CardTitle className="text-base line-clamp-2">{ad.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-900 font-semibold">${ad.price}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(ad.createdAt).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
