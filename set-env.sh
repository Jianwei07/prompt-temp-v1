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
export BITBUCKET_ACCESS_TOKEN="ATCTT3xFfGN0DYtAbFeq2qzfWZ12ONh2ldkVstEjQrNexAtUHSfU9CjPO5Mt4fOLY2YaIS5x_LxpDiJ5u4sYp41nJBOCFjle14gY5OGCa8QwFy-G1cq2xpTPUQM34Eh2PENZzZn_5hv_WBpY2mFJtPqiz7S1H3G-4g5nZGcnsDYaPf8pE465UiY=D1C2F212"

# Feature Flags
export REQUIRE_DELETE_APPROVAL="false"

echo "Environment variables have been set"

chmod +x set-env.sh 