FROM node:20-alpine AS build
WORKDIR /app
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

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/services/web-app services/web-app
WORKDIR /app/services/web-app
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
