# Etapa de desarrollo
FROM node:20-alpine AS development

WORKDIR /app

# Instalar dependencias necesarias
RUN apk add --no-cache libc6-compat openssl python3 make g++ bash

# Copiar archivos de configuración
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto de la app
COPY . .

# Generar el cliente de Prisma (necesario antes del build)
RUN npx prisma generate

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS production

# Instalar dependencias necesarias para producción
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copiar solo los archivos necesarios para producción
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=development /app/dist ./dist
COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/prisma ./prisma
COPY --from=development /app/generated ./generated

# Asegurar que Prisma funcione en producción
RUN npx prisma generate

# Exponer el puerto
EXPOSE 3000

# Comando de arranque
CMD ["node", "dist/main"]
