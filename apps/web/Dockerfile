FROM node:20-alpine
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate \
 && pnpm i -w && pnpm -C apps/web build
EXPOSE 5173
ENV VITE_SERVER_URL=http://localhost:8787
CMD ["pnpm","-C","apps/web","preview","--host","0.0.0.0","--port","5173"]
