#!/bin/sh
set -eu
if [ "${1:-}" != run ]; then
    test "$(cat /run/onion-key/hostname)" = "$ONION_HOST" || {
        echo 'The supplied key directory does not match the configured onion hostname.' >&2
        exit 1
    }
    mkdir -p /var/lib/tor/data /var/lib/tor/site
    if [ -f /var/lib/tor/site/hs_ed25519_secret_key ]; then
        cmp -s /run/onion-key/hs_ed25519_secret_key /var/lib/tor/site/hs_ed25519_secret_key || {
            echo 'Refusing to replace an existing onion identity in the Docker volume.' >&2
            exit 1
        }
    else
        cp /run/onion-key/hs_ed25519_secret_key /run/onion-key/hs_ed25519_public_key /run/onion-key/hostname /var/lib/tor/site/
    fi
    chmod 700 /var/lib/tor /var/lib/tor/data /var/lib/tor/site
    chmod 600 /var/lib/tor/site/hs_ed25519_* /var/lib/tor/site/hostname
    chown -R tor:tor /var/lib/tor
    exec su-exec tor /bin/sh "$0" run
fi
nginx -e stderr -g 'daemon off;' &
proxy_pid=$!
tor -f /etc/tor/torrc &
tor_pid=$!
trap 'kill "$proxy_pid" "$tor_pid" 2>/dev/null || true; wait || true' EXIT
trap 'exit 0' TERM INT
wait -n "$proxy_pid" "$tor_pid"
