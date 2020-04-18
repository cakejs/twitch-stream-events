# *** Docker command-line ***
#
# docker run -it -p 8443:8443 \
# --rm -v "$PWD":/usr/src/app \
# -w /usr/src/app --name twitch-events \
# twitch-stream-events index.js

FROM node:13.8.0-alpine3.10
RUN apk add --no-cache git
ENV NODE_ENV "production"
COPY . .
RUN npm install --loglevel verbose
EXPOSE 8443
