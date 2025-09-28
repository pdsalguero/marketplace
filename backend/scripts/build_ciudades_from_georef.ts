/// <reference lib="dom" />
import fs from 'node:fs'
import path from 'node:path'

// Usa fetch nativo de Node 18+ (tu imagen node:20-alpine lo tiene)
const provincias = fs.readFileSync(path.join('data','provincias.csv'),'utf8').trim().split(/\r?\n/).slice(1)

async function getLocalidades(prov: string) {
  const url = new URL('https://apis.datos.gob.ar/georef/api/localidades')
  url.searchParams.set('provincia', prov)
  url.searchParams.set('aplanar', 'true')
  url.searchParams.set('max', '5000')
  url.searchParams.set('campos', 'nombre,provincia.nombre')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const json: any = await res.json()
  return json.localidades as Array<{ nombre: string; provincia_nombre: string }>
}

function escapeCsv(s: string){
  const t = s.replaceAll('"','""')
  return /[",\n]/.test(t) ? `"${t}"` : t
}
function titleCase(s: string){
  return s.toLowerCase().replace(/(^|\s|\()([a-záéíóúñ])/g, (_m, p1, p2) => p1 + p2.toUpperCase())
}

async function main(){
  const outPath = path.join('data','ciudades.csv')
  const rows: string[] = ['city_name,province_name']
  for (const prov of provincias) {
    const locs = await getLocalidades(prov)
    for (const l of locs) {
      const provName = (l as any).provincia_nombre || prov
      rows.push(`${escapeCsv(l.nombre)},${escapeCsv(titleCase(provName))}`)
    }
    console.log(`OK: ${prov}`)
  }
  fs.mkdirSync('data', { recursive: true })
  fs.writeFileSync(outPath, rows.join('\n'))
  console.log(`Generado: ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
