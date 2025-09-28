# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# 1) deps sin postinstall (aún no copiamos prisma/)
COPY package*.json tsconfig.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts || npm install --ignore-scripts

# 2) ahora sí copiamos prisma y generamos el client
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# 3) copiamos el código y compilamos TS
COPY src ./src
# (si tenés otros archivos necesarios en runtime: copia aquí)
RUN npm run build  # -> genera dist/

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# copiamos node_modules de build (incluye @prisma/client y engines)
COPY --from=build /app/node_modules ./node_modules
# copiamos dist y prisma (por si usás introspección de schema o logs)
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000
# migraciones al arrancar y luego servidor
CMD sh -c "npx prisma migrate deploy && node dist/index.js"
