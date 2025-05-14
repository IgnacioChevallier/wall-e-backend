#!/bin/bash

# Script to check if version follows SemVer and determine if a version bump is needed
# Usage: ./semver.sh <type> [current_version]
# Type can be: major, minor, patch

set -e

TYPE=$1
CURRENT_VERSION=${2:-$(node -p "require('./package.json').version")}

if [[ ! $CURRENT_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Current version $CURRENT_VERSION does not follow SemVer (MAJOR.MINOR.PATCH)"
    exit 1
fi

# Parse version parts
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

# Calculate new version based on increment type
case $TYPE in
    major)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        ;;
    minor)
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
        ;;
    patch)
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
        ;;
    *)
        echo "Error: Type must be one of: major, minor, patch"
        exit 1
        ;;
esac

echo $NEW_VERSION 