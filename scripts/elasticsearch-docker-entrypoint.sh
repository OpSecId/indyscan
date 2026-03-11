#!/bin/sh
# Fix volume permissions when mounting /usr/share/elasticsearch/data (e.g. on Railway).
# The official image runs as user elasticsearch (uid 1000, gid 0); mounted volumes are often root-owned.
set -e
for dir in /usr/share/elasticsearch/data /usr/share/elasticsearch/logs; do
  if [ -d "$dir" ]; then
    chown -R 1000:0 "$dir" 2>/dev/null || true
  fi
done
# Original image entrypoint (path varies: elastic.co image vs Docker Hub)
if [ -x /usr/local/bin/docker-entrypoint.sh ]; then
  exec /usr/local/bin/docker-entrypoint.sh elasticsearch
elif [ -x /usr/share/elasticsearch/bin/docker-entrypoint.sh ]; then
  exec /usr/share/elasticsearch/bin/docker-entrypoint.sh elasticsearch
else
  exec tini -s -- /usr/share/elasticsearch/bin/elasticsearch
fi
