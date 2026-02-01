# Bear Beat - Next.js para Render
FROM node:20-alpine AS base

WORKDIR /app

# Dependencias
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Código y build
COPY . .
RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
CMD ["npm", "start"]
