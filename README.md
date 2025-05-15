## Related to prisma
Run this when changing the prisma.scheme
```bash
$ npx prisma generate
$ npx prisma migrate dev
```

# CI/CD Pipeline

## Continuous Integration (CI)
This project uses GitHub Actions for continuous integration. The CI pipeline runs automatically when:
- You push to any branch (except main)
- You create a pull request to the main branch

The CI process includes:
1. Code linting and type checking
2. Running unit tests
3. Building the application
4. Building and testing the Docker image and Docker Compose stack
5. Verifying SemVer compliance (on PRs to main)

## Continuous Deployment (CD)
The CD pipeline runs automatically when code is merged to the main branch and includes:
1. Building the Docker image with version tag from package.json
2. Pushing the image to GitHub Container Registry (ghcr.io)
3. Creating a GitHub Release with the version number
4. Optionally deploying to a production server

### Required GitHub Secrets for Deployment

For the CD pipeline to work properly, set up these GitHub repository secrets:

**Basic Deployment:**
- No additional secrets required for image publishing to GitHub Container Registry

**Production Deployment:**
- `DEPLOY_HOST`: Host IP or domain of your production server
- `DEPLOY_USER`: SSH username for the production server
- `DEPLOY_SSH_KEY`: Private SSH key for authentication

**Database Configuration:**
- `DATABASE_URL`: Full database connection string
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name

**Application Security:**
- `JWT_SECRET`: Secret key for JWT token generation/validation

To set up these secrets:
1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret" and add each required secret

To use the latest version in your Docker Compose:
```yaml
services:
  app:
    image: ghcr.io/username/wall-e-backend:latest  # Replace with your GitHub username
```

## Deployment with Docker Compose
For production deployment, use the production Docker Compose file:

1. Create a `.env` file with your environment variables:
```
DATABASE_URL=postgresql://postgres:password@db:5432/postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=postgres
```

2. Run the production stack:
```bash
$ docker-compose -f docker-compose.prod.yml up -d
```

3. To update to a new version:
```bash
$ docker-compose -f docker-compose.prod.yml pull
$ docker-compose -f docker-compose.prod.yml up -d
```

### Working with Semantic Versioning (SemVer)
This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

When creating a pull request to main, ensure you've updated the version in package.json according to SemVer principles.

## To format or lint run
```bash
$ npm run format
$ npm run lint
```

# Docker
## To start services just run
```bash
$ docker compose up -d
```
## To recreate containers
```bash
$ docker-compose up --build -d --force-recreate
```


### init prisma migrations in the db
```bash
$ docker compose exec app npx prisma migrate dev --name init
```

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

# Wallet Backend

## External Bank Integration

The system includes a simulated external bank service that handles two main operations:

1. Manual Bank Transfer
- Endpoint: `POST /bank/transfer`
- Used when users want to add money to their wallet from an external source
- Success rate: 90%
- Simulated processing time: 1 second

2. DEBIN (Débito Inmediato)
- Endpoint: `POST /bank/debin-request`
- Used when users want to request a direct debit from their bank account
- Approval rate: 80%
- Simulated processing time: 1.5 seconds

### How to Use

1. Manual Transfer:
```bash
curl -X POST http://localhost:3000/wallet/topup/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "method": "BANK_TRANSFER",
    "sourceIdentifier": "bank_account_123"
  }'
```

2. DEBIN Request:
```bash
curl -X POST http://localhost:3000/wallet/topup/debin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100
  }'
```

## Running the Services

The project uses Docker Compose to run multiple services:

1. Main API (port 3000)
2. External Bank Service (port 3001)
3. PostgreSQL Database (port 5432)

To start all services:

```bash
docker-compose up --build
```

## Environment Variables

Create a `.env` file with:

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/walle?schema=public
JWT_SECRET=your-secret-key
```

# esto va antes de hacer docker compose, ahora q metí la imagen de eva-bank
echo <TU_TOKEN> | docker login ghcr.io -u <tu_usuario_github> --password-stdin
