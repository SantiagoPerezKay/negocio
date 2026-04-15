FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL se inyecta en build time como ARG
# En EasyPanel: dejalo en /api (el nginx del frontend lo proxea al backend)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa final: nginx sirve el build ──────────────────────────────────────────
FROM nginx:alpine

# Instalar gettext para que envsubst esté disponible
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html

# Plantilla de nginx: BACKEND_URL se reemplaza en runtime
COPY nginx-frontend.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# Al iniciar: envsubst reemplaza ${BACKEND_URL} y lanza nginx
CMD ["/bin/sh", "-c", \
  "envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
