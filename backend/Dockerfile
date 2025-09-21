# Etapa de build
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
COPY prisma ./prisma
RUN npm install

COPY src ./src
RUN npm run build

# Etapa final
FROM node:18-alpine
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000
CMD ["node", "dist/index.js"]
