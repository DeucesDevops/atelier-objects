FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/typescript/package.json shared/typescript/package.json
COPY services/api-gateway/package.json services/api-gateway/package.json
COPY services/auth-service/package.json services/auth-service/package.json
COPY services/catalog-service/package.json services/catalog-service/package.json
COPY services/order-service/package.json services/order-service/package.json
COPY services/inventory-service/package.json services/inventory-service/package.json
COPY services/web-app/package.json services/web-app/package.json
RUN npm ci
COPY services/web-app services/web-app
RUN npm --workspace @commerce/web-app run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY services/web-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/services/web-app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
