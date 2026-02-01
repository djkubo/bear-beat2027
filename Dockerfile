# Bear Beat - Next.js para Render
FROM node:20-alpine AS base

WORKDIR /app

# Build args: Render debe tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
# en Environment con scope "Build" para que el prerender no falle
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

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
