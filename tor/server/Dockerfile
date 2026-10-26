FROM alpine:3
RUN apk add --no-cache tor nginx curl && addgroup -g 10001 site && adduser -D -H -u 10001 -G site site
COPY nginx.conf /etc/nginx/nginx.conf
COPY torrc /etc/tor/torrc
COPY start.sh /usr/local/bin/start-site
USER 10001:10001
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start-site"]
