export type Category = { id:number; parent_id:number|null; name:string; slug:string; icon?:string|null; sort_order:number; children?:Category[] };

export async function fetchCategories(domain='vehicles'): Promise<Category[]>{
  const r = await fetch(`${import.meta.env.VITE_API_URL}/categories?domain=${domain}`);
  if(!r.ok) throw new Error('Error cargando categorías');
  return (await r.json()).roots as Category[];
}
