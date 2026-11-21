#!/bin/sh
# Start a private DSH Web deployment behind an HTTPS/TLS reverse proxy.
set -eu

host="${REZ_DSH_PUBLIC_HOST:-${RAILWAY_PUBLIC_DOMAIN:-}}"
port="${PORT:-3080}"

if [ -z "$host" ]; then
  echo "Set REZ_DSH_PUBLIC_HOST to the HTTPS domain (without https://)." >&2
  exit 1
fi
case "$host" in
  *[!a-zA-Z0-9.-]* | .* | *..* | *.) 
    echo "REZ_DSH_PUBLIC_HOST must be a DNS hostname (without port or scheme)." >&2
    exit 1
    ;;
esac
case "$port" in
  "" | *[!0-9]*)
    echo "PORT must be numeric." >&2
    exit 1
    ;;
esac
if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
  echo "PORT out of range." >&2
  exit 1
fi

# DSH rejects a wildcard listener. The container's concrete IPv4 is allowed.
ip="$(hostname -i | awk '{print $1}')"
case "$ip" in
  "" | *[!0-9.]*)
    echo "Could not resolve a concrete IPv4 address for the container." >&2
    exit 1
    ;;
esac

exec dsh --profile web --no-open \
  --host "$ip" \
  --port "$port" \
  --public-url "https://$host/" \
  --trusted-host "$host"
