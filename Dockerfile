# Stick Blade Arena — container image for Google Cloud Run
FROM node:20-alpine

WORKDIR /app

# Install only production deps (just "ws") using the lockfile for reproducible builds
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source
COPY server.js index.html ./

ENV NODE_ENV=production
# Cloud Run injects PORT (defaults to 8080); server.js reads process.env.PORT
EXPOSE 8080

CMD ["node", "server.js"]
