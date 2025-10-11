FROM node:22

RUN apt-get update && apt-get install -y --no-install-recommends nginx \
	&& adduser --system --no-create-home --disabled-login --disabled-password --group nginx \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@latest

ENV PATH /app/node_modules/.bin:$PATH

COPY pnpm-lock.yaml ./
COPY package.json ./

RUN pnpm install --frozen-lockfile

ARG VITE_ENVIRONMENT
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_SENTRY_DSN
ARG GENERATE_SOURCEMAP
ARG SENTRY_AUTH_TOKEN
ARG VITE_GA_MEASUREMENT_ID
ARG VITE_JIRA_SERVICE_DESK_KEY
ENV VITE_ENVIRONMENT=${VITE_ENVIRONMENT}

COPY nginx.conf /etc/nginx/
COPY nginx-dora-fe.conf /etc/nginx/conf.d/

COPY . .

RUN pnpm build
RUN [ -z "$SENTRY_AUTH_TOKEN" ] || pnpm sentry:sourcemaps
#Remove sourcemaps if GENERATE_SOURCEMAP is false
RUN [ "$GENERATE_SOURCEMAP" != "true" ] && rm -r build/assets/*.map || echo "Source maps are generated"
RUN mv build/* /usr/share/nginx/html/
RUN mv src/assets /usr/share/nginx/html/assets
RUN rm -r /app
CMD ["nginx", "-g", "daemon off;"]
