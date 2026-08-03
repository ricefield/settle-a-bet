#!/bin/bash

# ------------------------------------------------------------------------
# This script creates a new git worktree for a specified branch,
# installs bun dependencies, generates Prisma client, and copies
# the .env file from the original directory where the script was invoked.
# ------------------------------------------------------------------------

# Store the original directory where the script was invoked
# This is crucial for copying files from the source worktree to the new one
ORIGINAL_INVOCATION_DIR=$(pwd)

# Prompt for the branch name
# Use printf for zsh compatibility when sourcing
printf "Enter branch name: "
read branch_name

# Check if input is empty
if [ -z "$branch_name" ]; then
    echo "Error: Branch name is required."
    return 1 2>/dev/null || exit 1
fi

# Replace slashes with hyphens for the directory name
dir_name=$(echo "$branch_name" | tr '/' '-')

# Define the target directory (sibling to the current directory)
target_dir="../$dir_name"

# Create the git worktree
echo "Creating worktree for branch '$branch_name' in '$target_dir'..."
git worktree add -b "$branch_name" "$target_dir"

# Check if worktree creation was successful
if [ $? -eq 0 ]; then
    echo "Successfully created worktree."

    # Change to the new directory
    cd "$target_dir" || { echo "Error: Could not change directory to '$target_dir'."; return 1 2>/dev/null || exit 1; }

    echo "Current directory is now: $(pwd)"
    echo "Running setup steps in the new worktree..."

    # Copy .env file from original invocation directory
    # The .env file should be present in the directory where the script was sourced from.
    if [ -f "$ORIGINAL_INVOCATION_DIR/.env" ]; then
        echo "Copying .env from $ORIGINAL_INVOCATION_DIR to $(pwd)/.env"
        cp "$ORIGINAL_INVOCATION_DIR/.env" ./.env || { echo "Error: Failed to copy .env file."; return 1 2>/dev/null || exit 1; }
    else
        echo "Warning: .env file not found in $ORIGINAL_INVOCATION_DIR. Copying .env.example instead."
        echo "Copying .env.example from $ORIGINAL_INVOCATION_DIR to $(pwd)/.env"
        cp "$ORIGINAL_INVOCATION_DIR/.env.example" ./.env || { echo "Error: Failed to copy .env.example file."; return 1 2>/dev/null || exit 1; }
    fi

    # The .linear.toml file should be present in the directory where the script was sou$
    if [ -f "$ORIGINAL_INVOCATION_DIR/.linear.toml" ]; then
        echo "Copying .linear.toml from $ORIGINAL_INVOCATION_DIR to $(pwd)/.linear.toml"
        cp "$ORIGINAL_INVOCATION_DIR/.linear.toml" ./.linear.toml || { echo "Error: Failed to copy .linear.toml file."; return 1 2>/dev/null || exit 1; }
    fi

    # Install bun dependencies
    echo "Running bun install..."
    bun install || { echo "Error: bun install failed. Please check the logs above."; return 1 2>/dev/null || exit 1; }

    # Generate Prisma client
    echo "Running bunx prisma generate..."
    bunx prisma generate || { echo "Error: bunx prisma generate failed. Please check the logs above."; return 1 2>/dev/null || exit 1; }

    echo "Setup complete for the new worktree."
else
    echo "Error: Failed to create worktree."
    return 1 2>/dev/null || exit 1
fi
