FROM node:18-alpine
WORKDIR /app

# 1) deps y prisma antes del install (porque postinstall corre prisma generate)
COPY package*.json tsconfig.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# 2) código y build
COPY . .
RUN npm run build

EXPOSE 4000
CMD ["node","dist/index.js"]
