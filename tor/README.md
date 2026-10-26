# Local onion mirror

This container serves the existing `ashfncomabc…onion` identity and proxies its port 80 to `http://host.docker.internal:4000`. Paths and query strings are preserved, so the local site's changes appear at the same onion URLs after each dev build.

Use this only when the production mirror is stopped, so two services do not advertise the same onion identity.

Keep Docker/Colima and `npm run dev` running. No container ports are published to the host. The proxy blocks `/editor` and accepts only GET/HEAD; the editor stays local.

The original key directory is mounted read-only. On first start, the container copies the identity into a private Docker volume; later starts verify that the identity still matches. Keys are never included in the Docker build context or image. Tor and the proxy run as the unprivileged `tor` user after initialization.

From the source repository root:

```sh
# Set this once in tor/.env (ignored by Git), pointing to the existing key directory:
# TOR_KEY_DIR=/absolute/path/to/the/address.onion

docker compose -f tor/compose.yaml up -d --build
docker compose -f tor/compose.yaml logs --tail=30 -f

# Stop the onion mirror; retains its identity and Tor state:
docker compose -f tor/compose.yaml down
```

The container restarts with Docker until explicitly stopped. Health checks confirm that the local proxy can reach the dev server; check for Tor's `Bootstrapped 100%` message and open the address in Tor Browser to verify network reachability.

Address: <http://ashfncomabccvkuuvzbsjobu5wvtlw2wpz4mj3co5g5boyturbf36cyd.onion/>

Tor setup reference: <https://community.torproject.org/onion-services/setup/>
