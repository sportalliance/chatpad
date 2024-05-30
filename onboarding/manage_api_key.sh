#!/bin/bash

# Check if the API key name and bearer token are provided as arguments
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <apikey_name> <bearer_token>"
  exit 1
fi

APIKEY_NAME=$1
BEARER_TOKEN=$2

# Function to handle errors
handle_error() {
  echo "An error occurred. Exiting."
  exit 1
}

# Check if the op CLI is installed
if ! command -v op &> /dev/null; then
  echo "1Password CLI (op) could not be found. Please install it before running this script."
  exit 1
fi

# Sign in to 1Password using the app integration
echo "Signing in to 1Password..."
if ! op signin --raw; then
  handle_error
fi
echo "Signed in to 1Password successfully."

# Function to convert name format
convert_name() {
  local name=$1
  echo $name | sed -e 's/-/ /' -e 's/-/./'
}

# Function to redact token
redact_token() {
  local token=$1
  local visible_start="${token:0:8}"
  local visible_end="${token: -4}"
  local redacted_part=$(printf '%*s' $((${#token} - 12)) | tr ' ' '*')
  echo "${visible_start}${redacted_part}${visible_end}"
}

# Generate the API key
echo "Generating API key..."
generate_response=$(curl -s 'https://api.openai.com/v1/dashboard/service_accounts' \
  -H "authorization: Bearer $BEARER_TOKEN" \
  -H 'accept: */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -H 'openai-organization: org-ii0hnFOsRe7LA9WZIh6qfXmS' \
  -H 'openai-project: proj_WyD7Ti008fMTnMBg2heMRYqq' \
  -H 'openai-sentinel-arkose-token: 41617d43e584dd784.4718792305|r=eu-west-1|meta=3|metabgclr=transparent|metaiconclr=%23757575|guitextcolor=%23000000|pk=23AAD243-4799-4A9E-B01D-1166C5DE02DF|at=40|sup=1|rid=21|ag=101|cdn_url=https%3A%2F%2Fopenai-api.arkoselabs.com%2Fcdn%2Ffc|lurl=https%3A%2F%2Faudio-eu-west-1.arkoselabs.com|surl=https%3A%2F%2Fopenai-api.arkoselabs.com|smurl=https%3A%2F%2Fopenai-api.arkoselabs.com%2Fcdn%2Ffc%2Fassets%2Fstyle-manager' \
  -H 'origin: https://platform.openai.com' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://platform.openai.com/' \
  -H 'sec-ch-ua: "Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' \
  --data-raw "{\"id\":\"$APIKEY_NAME\"}") || handle_error
echo "API key generated successfully."

# Extract the sensitive_id (TOKEN) and created_at from the response
TOKEN=$(echo $generate_response | jq -r '.secret[0].sensitive_id')
CREATED_AT=$(echo $generate_response | jq -r '.secret[0].created')

# Redact the token
REDACTED_TOKEN=$(redact_token $TOKEN)

# Convert the API key name to the required format
MODIFIED_NAME=$(convert_name $APIKEY_NAME)

# Add the generated key to 1Password
echo "Adding API key to 1Password..."
op_item_create_response=$(op item create \
  --category=login \
  --title="$APIKEY_NAME API Key" \
  --vault="OpenAI API Keys" \
  --url="https://api.openai.com" \
  --tags="API,OpenAI" \
  username="$APIKEY_NAME" \
  password="$TOKEN") || handle_error
echo "API key added to 1Password successfully."

# Modify the API key
echo "Modifying API key..."
modify_response=$(curl -s 'https://api.openai.com/dashboard/organizations/org-ii0hnFOsRe7LA9WZIh6qfXmS/projects/proj_WyD7Ti008fMTnMBg2heMRYqq/api_keys' \
  -H "authorization: Bearer $BEARER_TOKEN" \
  -H 'accept: */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -H 'origin: https://platform.openai.com' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://platform.openai.com/' \
  -H 'sec-ch-ua: "Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' \
  --data-raw "{\"action\":\"update\",\"redacted_key\":\"$REDACTED_TOKEN\",\"created_at\":$CREATED_AT,\"name\":\"$MODIFIED_NAME\",\"scopes\":[\"model.read\",\"api.model.read\",\"model.request\",\"api.model.request\"]}") || handle_error
echo "API key modified successfully."

