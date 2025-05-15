# Etapa de construcción
FROM node:20-alpine AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

# Instalar todas las dependencias para el build
RUN npm ci

COPY . .

# Depuración: Verificar binarios y dependencias (sin romper el build si falta @nestjs/cli)
RUN ls -l node_modules/.bin && npx --version && (npm list @nestjs/cli || echo "@nestjs/cli no está instalado")

# Compilar la aplicación
RUN npm run build

# Build bcrypt desde fuente para evitar problemas con glibc en Alpine
RUN apk --no-cache add --virtual builds-dependencies build-base python3 make && \
    npm i bcrypt && \
    npm rebuild bcrypt --build-from-source && \
    apk del builds-dependencies

# Etapa final: imagen más liviana para producción
FROM node:20-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
