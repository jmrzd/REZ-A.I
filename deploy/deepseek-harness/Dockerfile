# DeepSeek Harness v0.2.2-rc.5 (official npm package) — remote Node service.
# Build and run this image ON THE REMOTE SERVER, never on a visitor's PC.
# Upstream requires Node >=24.9.0.
FROM node:24-bookworm-slim

ARG DSH_VERSION=0.2.2-rc.5

RUN node -e "const [a,b]=process.versions.node.split('.').map(Number);if(a<24||(a===24&&b<9))process.exit(1)" \
    && npm install --global --no-audit --no-fund "@deepseek-ai/dsh@${DSH_VERSION}"

RUN mkdir -p /data/dsh /workspace \
    && chown -R node:node /data/dsh /workspace

USER node
ENV NODE_ENV=production
ENV HOME=/data/dsh
ENV DSH_HOME=/data/dsh
WORKDIR /workspace
EXPOSE 3080

# These are the upstream's supported web-server arguments.
ENTRYPOINT ["dsh"]
CMD ["web", "--host", "0.0.0.0", "--port", "3080", "--no-open"]
