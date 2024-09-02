# Image size ~ 400MB
FROM node:21-alpine3.18 as builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

COPY . .

COPY package*.json *-lock.yaml ./


RUN apk add --no-cache --virtual .gyp \
        python3 \
        make \
        g++ \
    && apk add --no-cache git \
    && pnpm install \
    && apk del .gyp

FROM node:21-alpine3.18 as deploy

WORKDIR /app

ENV PORT=
ENV ASSISTANT ID=
ENV OPENAI API KEY=
ENV EAPI URL=
ENV EAPI INSTANCE=
ENV EAPI KEY=
ENV BUSINESS NAME=
ENV BUSINESS NUMBER=
ENV BUSINESS ADDRESS=
ENV CALENDAR ID=
ENV TIMEZONE=

ENV TZ=Europe/Madrid

EXPOSE $PORT

COPY --from=builder /app ./
COPY --from=builder /app/*.json /app/*-lock.yaml ./


RUN corepack enable && corepack prepare pnpm@latest --activate 
ENV PNPM_HOME=/usr/local/bin

RUN npm cache clean --force && pnpm install --production --ignore-scripts \
    && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
    && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

RUN npm install pm2 -g
RUN pnpm install --frozen-lockfile --production

CMD ["pm2-runtime", "start", "./src/app.js", "--cron", "0 */12 * * *"]

