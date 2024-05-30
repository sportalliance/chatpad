# Manage API Key Script

This script automates the process of generating, modifying, and storing an API key using OpenAI's API and 1Password.

## Prerequisites

1. **1Password CLI**: Ensure you have the `op` CLI installed and integrated with the 1Password app.
    - [Install 1Password CLI](https://developer.1password.com/docs/cli/get-started/)
    - [Integrate 1Password CLI with 1Password app](https://developer.1password.com/docs/cli/app-integration/)

2. **jq**: A lightweight and flexible command-line JSON processor.
    - Install `jq`: `brew install jq` (macOS) or download from
      the [official website](https://stedolan.github.io/jq/download/).

3. **cURL**: A command-line tool for transferring data with URLs.
    - Install `cURL`: `brew install curl` (macOS) or download from
      the [official website](https://curl.se/download.html).

## Usage

### Script Execution

1. **Download the Script**:
   Save the script below to a file named `manage_api_key.sh`.

2. **Make the Script Executable**:
   ```bash
   chmod +x manage_api_key.sh
   ```

3. **Run the Script**:
   ```bash
   ./manage_api_key.sh <apikey_name> <bearer_token>
4. **Example**:
   ```bash
   ./manage_api_key.sh chatpad-lorenz-schumann your_bearer_token
   ```

## Hardcoded Project ID

The script currently has a hardcoded project ID for the "chatpad.sportalliance.com" project. You need to adjust the project ID according
to your needs.

Locate the following line in the script:

```bash
-H 'openai-project: proj_WyD7Ti008fMTnMBg2heMRYqq'
```
Replace proj_WyD7Ti008fMTnMBg2heMRYqq with other project ID if needed
