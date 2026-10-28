#!/usr/bin/env bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:-rateprofcuaban-vn}"
INSTANCE_NAME="${GCP_SQL_INSTANCE:-rateurprofs-db}"

CURRENT_IP=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
  echo "❌ Could not determine current public IP address."
  exit 1
fi

echo "🔍 Detected current public IP: $CURRENT_IP"
echo "📡 Fetching current Cloud SQL authorized networks for $INSTANCE_NAME..."

EXISTING_IPS=$(gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(settings.ipConfiguration.authorizedNetworks[].value)" 2>/dev/null | tr ';' ',' | tr '\n' ',' | sed 's/,$//')

if echo "$EXISTING_IPS" | grep -q "$CURRENT_IP"; then
  echo "✅ Current IP ($CURRENT_IP) is already authorized in Cloud SQL ($INSTANCE_NAME)!"
  exit 0
fi

if [ -n "$EXISTING_IPS" ]; then
  NEW_IPS="$EXISTING_IPS,$CURRENT_IP/32"
else
  NEW_IPS="$CURRENT_IP/32"
fi

echo "🚀 Adding $CURRENT_IP/32 to Cloud SQL authorized networks..."
gcloud sql instances patch "$INSTANCE_NAME" --project="$PROJECT_ID" --authorized-networks="$NEW_IPS" --quiet

echo "✅ Successfully authorized $CURRENT_IP in Cloud SQL ($INSTANCE_NAME)!"
