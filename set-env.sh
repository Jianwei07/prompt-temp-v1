#!/bin/bash

# Bitbucket Configuration
# Replace these values with your actual Bitbucket information:
# - your-workspace: Your Bitbucket workspace name (e.g., "mycompany")
# - your-repo: Your repository slug (e.g., "prompt-template")
# - your-username: Your Bitbucket username
# - your-access-token: Your Bitbucket access token (generate from Bitbucket settings)
export BITBUCKET_WORKSPACE="debugging-dragons"
export BITBUCKET_REPO="prompt-template"
export BITBUCKET_USERNAME="jordanvckj"
export BITBUCKET_ACCESS_TOKEN="DECATED"

# Feature Flags
export REQUIRE_DELETE_APPROVAL="false"

echo "Environment variables have been set"

chmod +x set-env.sh 