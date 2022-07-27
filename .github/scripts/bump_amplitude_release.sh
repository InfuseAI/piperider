#! /bin/bash
set -x
API_KEY=${AMPLITUDE_API_KEY:-}
SECRET_KEY=${AMPLITUDE_SECRET_KEY:-}
API_ENDPOINT='https://amplitude.com/api/2/release'

if [ "$API_KEY" = "" ] || [ "$SECRET_KEY" = "" ]; then
  echo "[Skip] No Amplitude API key or secret key provided."
  exit 0
fi

RELEASE_START=$(date -u "+%Y-%m-%d %H:%m:%S")
VERSION=${1:-}
ENVIRONMENT=${2:-production}

if [[ "$ENVIRONMENT" == "production" ]]; then
  TITLE="PipeRider v$VERSION"
else
  TITLE="PipeRider $ENVIRONMENT v$VERSION"
fi

curl -X POST $API_ENDPOINT \
  -H "Content-Type: application/json" \
  -u "$API_KEY:$SECRET_KEY" \
  -d "{
    \"release_start\": \"$RELEASE_START\",
    \"title\": \"$TITLE\",
    \"version\": \"$VERSION\"
  }"

echo "[Done] Amplitude release created: $TITLE"
