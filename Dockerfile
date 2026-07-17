# Truth-Anchor — web UI + /api/process. See DEPLOY.md.
FROM node:22-slim

# whatsapp-web.js pins puppeteer, whose postinstall pulls ~700MB of Chrome.
# This image only ever runs server.js, which never imports src/whatsapp.js,
# so the browser is dead weight. Must be set before npm ci.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Layer the install so code edits don't re-run npm ci.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Includes the seeded cache/ bundles, so ensureSeed() finds them and skips TTS at boot.
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
