FROM python:3.12-slim

WORKDIR /app
COPY . .

# Permissive install — same reasoning as the node sandbox.
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt 2>/dev/null; fi; \
    if [ -f pyproject.toml ]; then pip install --no-cache-dir . 2>/dev/null; fi; \
    exit 0

EXPOSE 3001

CMD ["sh", "-c", "\
  if [ -f main.py ]; then PORT=3001 python main.py; \
  elif [ -f app.py ]; then PORT=3001 python app.py; \
  elif [ -f server.py ]; then PORT=3001 python server.py; \
  elif [ -f __main__.py ]; then PORT=3001 python __main__.py; \
  else echo 'sandbox: no entry point found' >&2; exit 1; fi"]
