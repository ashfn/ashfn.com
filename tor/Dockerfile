FROM alpine:3
RUN apk add --no-cache tor nginx curl su-exec
COPY nginx.conf /etc/nginx/nginx.conf
COPY torrc /etc/tor/torrc
COPY start.sh /usr/local/bin/start-onion
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start-onion"]
