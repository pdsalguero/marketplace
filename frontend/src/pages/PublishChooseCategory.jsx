import CategoryGrid from "../components/CategoryGrid";

export default function PublishChooseCategory() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Publicar — elige una categoría</h1>
      <CategoryGrid />
    </div>
  );
}
