#!/bin/sh
set -eu
# Refuse to generate a replacement identity if the expected keys are missing.
test -s /var/lib/tor/site/hs_ed25519_secret_key
test "$(cat /var/lib/tor/site/hostname)" = ashfncomabccvkuuvzbsjobu5wvtlw2wpz4mj3co5g5boyturbf36cyd.onion
nginx -e stderr -g 'daemon off;' &
web_pid=$!
tor -f /etc/tor/torrc &
tor_pid=$!
trap 'kill "$web_pid" "$tor_pid" 2>/dev/null || true; wait || true' EXIT
trap 'exit 0' TERM INT
wait -n "$web_pid" "$tor_pid"
