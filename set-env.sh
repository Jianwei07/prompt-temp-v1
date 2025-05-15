#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Feature Flags
export REQUIRE_DELETE_APPROVAL="false"

echo "Environment variables have been set"
chmod +x set-env.sh