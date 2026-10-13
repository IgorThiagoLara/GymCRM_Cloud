FROM node:20-alpine AS build
ARG WORKSPACE
WORKDIR /app
COPY package.json ./
COPY services ./services
COPY bff-web ./bff-web
COPY api-gateway ./api-gateway
COPY frontend ./frontend
RUN npm install --workspace=${WORKSPACE} --include-workspace-root
RUN npm run build --workspace=${WORKSPACE}

FROM node:20-alpine
ARG WORKSPACE
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/${WORKSPACE}/dist ./dist
COPY --from=build /app/${WORKSPACE}/package.json ./package.json
USER node
CMD ["node", "dist/main.js"]
