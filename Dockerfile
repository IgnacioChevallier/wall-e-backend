FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

COPY . .

RUN npm run build

# Build bcrypt from source to avoid glibc issues on Alpine
RUN apk --no-cache add --virtual builds-dependencies build-base python3 make && npm i bcrypt && npm rebuild bcrypt --build-from-source  

FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]