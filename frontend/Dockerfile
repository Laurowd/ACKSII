FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# Cypress is a test dependency. Its desktop executable is not needed to build
# the static site and would add a large, unused download to every image build.
ENV CYPRESS_INSTALL_BINARY=0
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -T 4 -O /dev/null http://127.0.0.1:8080/health || exit 1
