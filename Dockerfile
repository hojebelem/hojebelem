# 1) build: instala tudo e compila em modo standalone
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_STANDALONE=1
RUN npx prisma generate && npm run build \
  && node -p "require('prisma/package.json').version" > /prisma-version

# 2) runtime: só o servidor compilado + Prisma (para as migrations)
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# escuta em todas as interfaces do container (o padrão seria o hostname dele)
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# CLI do Prisma (só para `migrate deploy`) numa pasta à parte, na mesma versão do projeto
COPY --from=build /prisma-version /tmp/prisma-version
RUN npm install --prefix /prisma-cli --no-audit --no-fund "prisma@$(cat /tmp/prisma-version)" \
  && rm -f /tmp/prisma-version \
  && mkdir -p /app/public/uploads \
  && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "node /prisma-cli/node_modules/prisma/build/index.js migrate deploy && node server.js"]
