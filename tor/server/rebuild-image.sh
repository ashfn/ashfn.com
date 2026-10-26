#!/bin/sh
set -eu
cd /opt/ashfn-onion
old_image=$(docker image inspect ashfn-onion:local --format '{{.Id}}' 2>/dev/null || true)
if [ -n "$old_image" ]; then docker tag "$old_image" ashfn-onion:rollback; fi
# A failed build leaves the running container untouched.
docker compose build --pull --no-cache
if docker compose up -d; then
    container=$(docker compose ps -q site)
    attempt=0
    while [ "$attempt" -lt 60 ]; do
        state=$(docker inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null || true)
        if [ "$state" = healthy ]; then exit 0; fi
        if [ "$state" = unhealthy ]; then break; fi
        attempt=$((attempt + 1))
        sleep 5
    done
fi
if [ -n "$old_image" ]; then
    docker tag ashfn-onion:rollback ashfn-onion:local
    docker compose up -d
fi
echo 'Container update failed its health check; previous image restored if available.' >&2
exit 1
