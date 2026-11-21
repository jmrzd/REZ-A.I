FROM node:24-bookworm-slim
ENV NODE_ENV=production DSH_HOME=/srv/rez/data
WORKDIR /srv/rez
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && mkdir -p data work && chown -R node:node /srv/rez
COPY --chown=node:node server.mjs guard.mjs restricted.yml ./
USER node
EXPOSE 3080
CMD ["node","server.mjs"]
