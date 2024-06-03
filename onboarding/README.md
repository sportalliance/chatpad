# Manage API Key Script

This script automates the process of generating, modifying, and storing an API key using OpenAI's API and 1Password.

## Prerequisites

1. **1Password CLI**: Ensure you have the `op` CLI installed and integrated with the 1Password app.
    - [Install 1Password CLI](https://developer.1password.com/docs/cli/get-started/)
    - [Integrate 1Password CLI with 1Password app](https://developer.1password.com/docs/cli/app-integration/)
1. **Go**: Ensure you have Go installed on your machine.
    - [Install Go](https://golang.org/doc/install) e.g. `brew install go`
    - Alternatively use a docker image


## Usage

The script is witten in

### Script Execution

1. **Checkout the repository**:

1. **Run the Script**:
   Make sure to use a session token taken from the browser.
   ```bash
   go run main.go --token sses-*** --email some.email@sportalliance.com
   ```
   or using docker
   ```bash
   docker run \
     -it \
     --rm \
     -v "$PWD":/tmp/onboarding \
     -w /tmp/onboarding \
     golang:1.23 run main.go --token sses-*** --email some.email@sportalliance.com
   ```

## Hardcoded Project ID

The script currently has a hardcoded project ID for the "chatpad.sportalliance.com" project. You need to adjust the project ID according
to your needs.

Locate the following line in the script:

```bash
-H 'openai-project: proj_WyD7Ti008fMTnMBg2heMRYqq'
```
Replace proj_WyD7Ti008fMTnMBg2heMRYqq with other project ID if needed
