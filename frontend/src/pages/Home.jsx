import React from "react";
import Container from "../components/ui/Container";
import { Card, CardContent } from "../components/ui/Card";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <Container className="py-10 space-y-10">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Bienvenido a Marketplace</h1>
        <p className="text-gray-600 mt-3 text-lg">Compra y vende vehículos y más, fácil y rápido.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link to="/publish" className="px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-black transition">Publicar</Link>
          <Link to="/ads" className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition">Ver anuncios</Link>
        </div>
      </section>

      {/* Categorías destacadas */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Vehículos", to: "/publish/autos", emoji: "🚗" },
            { title: "Marketplace", to: "/ads?category=OTROS", emoji: "🛍️" },
            { title: "Servicios", to: "/ads?category=SERVICIOS", emoji: "🧰" },
          ].map((c) => (
            <Card key={c.title}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="text-3xl">{c.emoji}</div>
                  <div className="font-medium text-lg mt-2">{c.title}</div>
                </div>
                <Link to={c.to} className="px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm transition">Explorar</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
