FROM node:24-bookworm-slim AS build
# Build from the repository root: docker build -f frontend/Dockerfile .
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Cypress is a test dependency. Its desktop executable is not needed to build
# the static site and would add a large, unused download to every image build.
ENV CYPRESS_INSTALL_BINARY=0
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
COPY backend/src/data/domainIncomeFactors.json /app/backend/src/data/domainIncomeFactors.json
COPY backend/src/lib/classAbilities.ts backend/src/lib/classChoicePlan.ts backend/src/lib/classProficiencies.ts backend/src/lib/combatEquipment.ts backend/src/lib/creationRules.ts backend/src/lib/gameRules.ts backend/src/lib/levelReconciliation.ts backend/src/lib/proficiencyBonus.ts backend/src/lib/proficiencyRanks.ts backend/src/lib/researchAssistance.ts backend/src/lib/warlockPaths.ts backend/src/lib/weaponAttacks.ts /app/backend/src/lib/
COPY backend/src/data/acksRules.json /app/backend/src/data/acksRules.json
COPY backend/src/data/spellAccess.json /app/backend/src/data/spellAccess.json
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/frontend/dist /srv
COPY frontend/Caddyfile /etc/caddy/Caddyfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -T 4 -O /dev/null http://127.0.0.1:8080/health || exit 1
