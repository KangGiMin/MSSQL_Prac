FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# SQL authentication uses the JS driver; the Windows-only native driver is unused.
RUN npm ci --ignore-scripts
COPY index.html vite.config.js ./
COPY src ./src
COPY shared ./shared
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 SQL_AUTH=sql DEPLOYMENT_MODE=hosted
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY database/seeds ./database/seeds
COPY scripts/start-hosted.mjs ./scripts/start-hosted.mjs
USER node
EXPOSE 3001
CMD ["node", "scripts/start-hosted.mjs"]
