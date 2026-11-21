# Cloud-only DeepSeek Harness for a private REZ A.I operator workspace.
# This is a separate long-running service, not a Vercel Function or CF Worker.
FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    DSH_HOME=/home/node/.dsh

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git tini \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @deepseek-ai/dsh@0.2.2-rc.5 \
    && mkdir -p /home/node/.dsh /home/node/workspace \
    && chown -R node:node /home/node/.dsh /home/node/workspace

COPY --chown=node:node start.sh /usr/local/bin/rez-dsh-start
RUN chmod 0755 /usr/local/bin/rez-dsh-start

USER node
WORKDIR /home/node/workspace
EXPOSE 3080
ENTRYPOINT ["tini", "--", "/usr/local/bin/rez-dsh-start"]
