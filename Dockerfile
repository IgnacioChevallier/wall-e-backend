FROM node:20-alpine AS builder

# Definir argumentos de construcción
ARG NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para poder compilar)
RUN npm ci

COPY . .

# Instalar Nest CLI globalmente para poder ejecutar `nest build`
RUN npm install -g @nestjs/cli

# Compilar la aplicación
RUN npm run build

# Build bcrypt desde fuente para evitar problemas con glibc en Alpine
RUN apk --no-cache add --virtual builds-dependencies build-base python3 make \
    && npm install bcrypt \
    && npm rebuild bcrypt --build-from-source

# ---------------------------------------------------------

FROM node:20-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Copiar solo lo necesario desde el builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "dist/main"]
