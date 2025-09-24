-- imageKeys ya debería existir. Aquí añadimos atributos de AUTOS y enums.

-- Enums (crea sólo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Transmission') THEN
    CREATE TYPE "Transmission" AS ENUM ('MANUAL','AUTOMATIC');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Fuel') THEN
    CREATE TYPE "Fuel" AS ENUM ('GASOLINE','DIESEL','EV','HYBRID');
  END IF;
END$$;

-- Columnas de Autos (todas NULLables para no romper datos)
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "brand"       TEXT;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "model"       TEXT;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "year"        INTEGER;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "mileage"     INTEGER;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "transmission" "Transmission";
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "fuel"        "Fuel";
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "location"    TEXT;

-- createdAt/updatedAt backfill por si faltaban (idempotente)
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Ad" SET "createdAt" = COALESCE("createdAt", NOW());
UPDATE "Ad" SET "updatedAt" = COALESCE("updatedAt", NOW());
ALTER TABLE "Ad" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "Ad" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Category enum/columna (si no lo tenías aún)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Category') THEN
    CREATE TYPE "Category" AS ENUM ('AUTOS','INMUEBLES','ELECTRONICA','HOGAR','EMPLEO','SERVICIOS','MODA','MASCOTAS','OTROS');
  END IF;
END$$;

ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "category" "Category";
UPDATE "Ad" SET "category" = 'OTROS' WHERE "category" IS NULL;
ALTER TABLE "Ad" ALTER COLUMN "category" SET NOT NULL;
