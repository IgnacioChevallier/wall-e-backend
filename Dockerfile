# Development stage
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Copy config files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache libc6-compat openssl

# Set working directory
WORKDIR /usr/src/app

# Copy only what's needed
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# paths
COPY --from=development /usr/src/app/dist ./dist
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/prisma ./prisma
COPY --from=development /usr/src/app/generated ./generated

EXPOSE 3000

CMD ["node", "dist/main"]
