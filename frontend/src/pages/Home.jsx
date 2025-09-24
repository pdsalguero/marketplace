import React from "react";
import Container from "../components/ui/Container";
import { Card, CardContent } from "../components/ui/Card";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <Container className="py-8 space-y-8">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Bienvenido a Marketplace</h1>
        <p className="text-gray-600 mt-2">Compra y vende vehículos y más, fácil y rápido.</p>
        <div className="mt-5 flex gap-3 justify-center">
          <Link to="/publish" className="px-5 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-black">Publicar</Link>
          <Link to="/ads" className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50">Ver anuncios</Link>
        </div>
      </section>

      {/* Grilla rápida (categorías destacadas) */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Vehículos", to: "/publish/autos", emoji: "🚗" },
            { title: "Marketplace", to: "/ads?category=OTROS", emoji: "🛍️" },
            { title: "Servicios", to: "/ads?category=SERVICIOS", emoji: "🧰" },
          ].map((c) => (
            <Card key={c.title}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-2xl">{c.emoji}</div>
                  <div className="font-medium">{c.title}</div>
                </div>
                <Link to={c.to} className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">Explorar</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
