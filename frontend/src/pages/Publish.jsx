import React from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

export default function Publish() {
  const cards = [
    { emoji: "🚗", title: "Vehículos", desc: "Autos, motos, camiones", to: "/publish/autos" },
    { emoji: "🏠", title: "Inmuebles", desc: "Próximamente", to: "/publish/inmuebles" },
    { emoji: "🛍️", title: "Marketplace", desc: "Próximamente", to: "/publish/otros" },
  ];

  return (
    <Container className="py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Elegí qué querés publicar</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{c.emoji}</span> {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-gray-600">{c.desc}</div>
              <Link to={c.to} className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">Empezar</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
