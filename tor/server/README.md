# Server deployment

This serves static files from `ashfn/ashfn.github.io`, branch `main`, through Tor.
The container runs Tor and Nginx as an unprivileged user with no published ports.

The sync timer checks GitHub every five minutes. It validates a new export before
switching to it, and retains two previous versions. A failed fetch leaves the
current site running. Content updates do not need a container rebuild.

Host paths:

- `/opt/ashfn-onion`: container configuration and update script.
- `/srv/ashfn-site`: downloaded repository and static releases.
- `/var/lib/ashfn-onion`: private onion identity and Tor state.

The identity must be installed before startup, owned by UID 10001, with directory
permissions 0700 and key permissions 0600. Never add keys to this repository or image.

The image update timer rebuilds the container on Sundays at 04:00 UTC, with up to
15 minutes of delay. A failed health check restores the previous image. Host OS
security updates must also be configured on the server.

Run these checks on the server:

```sh
sudo docker compose -f /opt/ashfn-onion/compose.yaml ps
sudo systemctl start ashfn-site-sync.service
sudo journalctl -u ashfn-site-sync.service -n 20
sudo systemctl list-timers 'ashfn-*'
```

The published GitHub files are the source of truth. Local changes appear here only
after publishing them to `ashfn.github.io`. The local development server remains
at http://localhost:4000 and is independent of this server.

Server security updates are enabled through Ubuntu unattended-upgrades. SSH accepts
keys only, root SSH login is disabled, and fail2ban limits repeated login failures.
Automatic security reboots are allowed at 04:30 UTC when required, including when
users are logged in. This briefly interrupts services; the Tor container restarts
automatically. The policy is in
`/etc/apt/apt.conf.d/99-ashfn-reboots`, copied from `99-ashfn-reboots` here. The host
timezone is UTC.
