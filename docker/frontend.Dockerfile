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

FROM nginx:alpine
ARG WORKSPACE
COPY --from=build /app/${WORKSPACE}/dist /usr/share/nginx/html
COPY ${WORKSPACE}/nginx.conf /etc/nginx/conf.d/default.conf
