FROM node:20-alpine AS builder

# Definir argumentos de construcción
ARG NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./

# Instalar todas las dependencias para el build
RUN npm ci

COPY . .

# Establecer NODE_ENV durante la construcción
RUN npm run build

# Build bcrypt from source to avoid glibc issues on Alpine
RUN apk --no-cache add --virtual builds-dependencies build-base python3 make && npm i bcrypt && npm rebuild bcrypt --build-from-source  

FROM node:20-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]