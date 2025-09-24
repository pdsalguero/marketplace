import React from "react";
import Container from "../../components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { useParams } from "react-router-dom";

export default function GenericPublish() {
  const { slug } = useParams();
  return (
    <Container className="py-8">
      <Card>
        <CardHeader>
          <CardTitle>Publicar: {slug}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-600">Flujo todavía no implementado.</div>
        </CardContent>
      </Card>
    </Container>
  );
}
