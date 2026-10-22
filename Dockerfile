# The build output is platform-independent static files, so build them natively
# once instead of under emulation for each target platform
FROM --platform=$BUILDPLATFORM node:26-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

################################################################################

FROM nginxinc/nginx-unprivileged:1.30-alpine

ENV WORMHOLE_BASE_PATH=/wormhole \
    WORMHOLE_TOKEN_SERVICE_URL=/token-service \
    WORMHOLE_ROUTE_REGISTRY_URL=/route-registry \
    WORMHOLE_LOGIN_URL=/token-service/auth/login?next=

# mkdir first, since COPY --chmod would also make the directory it creates 644
RUN rm /etc/nginx/conf.d/default.conf && mkdir /etc/nginx/templates
COPY --chmod=755 nginx/10-wormhole-base-path.envsh /docker-entrypoint.d/
COPY --chmod=644 nginx/default.conf.template /etc/nginx/templates/
COPY --from=builder /app/dist /usr/share/nginx/wormhole

EXPOSE 8080
