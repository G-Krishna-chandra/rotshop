FROM node:20-slim

WORKDIR /app
COPY . .

# Permissive install — repos may have postinstall scripts we can't trust, and we
# want the container to build even if some deps fail. The sandbox is throwaway.
RUN npm install --production --ignore-scripts 2>/dev/null; exit 0

EXPOSE 3001

# Try the package.json "start" script first, then common entry points.
CMD ["sh", "-c", "\
  if [ -f package.json ] && grep -q '\"start\"' package.json; then PORT=3001 npm start; \
  elif [ -f index.js ]; then PORT=3001 node index.js; \
  elif [ -f server.js ]; then PORT=3001 node server.js; \
  elif [ -f app.js ]; then PORT=3001 node app.js; \
  else echo 'sandbox: no entry point found' >&2; exit 1; fi"]
