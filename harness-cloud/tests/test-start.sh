#!/bin/sh
# Offline smoke test of our start wrapper. Does not install DeepSeek Harness.
set -eu
root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
temp="$(mktemp -d)"
trap 'rm -rf "$temp"' EXIT HUP INT TERM
cat > "$temp/dsh" <<'FAKE'
#!/bin/sh
printf '%s\n' "$@" > "$REZ_DSH_ARGS_FILE"
FAKE
chmod +x "$temp/dsh"

PATH="$temp:$PATH" REZ_DSH_PUBLIC_HOST="dsh.example.com" PORT=3080 \
  REZ_DSH_ARGS_FILE="$temp/args" sh "$root/start.sh"

grep -Fxq -- '--profile' "$temp/args"
grep -Fxq -- 'web' "$temp/args"
grep -Fxq -- '--no-open' "$temp/args"
grep -Fxq -- 'https://dsh.example.com/' "$temp/args"
grep -Fxq -- '--trusted-host' "$temp/args"

if PATH="$temp:$PATH" REZ_DSH_PUBLIC_HOST="bad.example.com/extra" PORT=3080 \
  REZ_DSH_ARGS_FILE="$temp/args2" sh "$root/start.sh" >/dev/null 2>&1; then
  echo "Expected invalid hostname to be rejected" >&2
  exit 1
fi
echo "Wrapper smoke tests passed."
