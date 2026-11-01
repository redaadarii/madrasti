# syntax=docker/dockerfile:1
# Construit depuis la racine du monorepo : le web dépend du paquet partagé packages/shared.
#   docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
# Seules les dépendances du web (et du paquet partagé) sont installées, pas celles de l'application mobile.
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @madrasti/web
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @madrasti/web

# nginx sert l'application et relaie /api vers le backend (y compris le flux SSE).
FROM nginx:1.29-alpine
ENV BACKEND_URL=http://backend:8080 \
    JITSI_ORIGIN=https://meet.jit.si \
    PAYMENT_FORM_ORIGINS="https://testpayment.cmi.co.ma https://payment.cmi.co.ma"
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
