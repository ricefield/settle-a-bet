#!/bin/bash

# ----------------------------------------------------------------------------
# This script removes the current git worktree, returns to the primary worktree,
# and optionally deletes the associated local and remote branches.
# ----------------------------------------------------------------------------

# Get current branch name and directory
current_branch=$(git branch --show-current)
current_dir=$(pwd)

# Check if we are in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: Not currently in a git worktree."
    return 1 2>/dev/null || exit 1
fi

# Check if this is the main worktree
# In a secondary worktree, .git is a file pointing to the gitdir.
# In the main worktree, .git is a directory.
if [ -d ".git" ]; then
    echo "Error: You seem to be in the main repository ('.git' is a directory)."
    echo "This script is intended to be run from inside a secondary worktree."
    return 1 2>/dev/null || exit 1
fi

# Git lists the primary worktree first in porcelain output. Discovering it here
# keeps this script independent of the checkout's parent directory and name.
target_dir=$(git worktree list --porcelain | sed -n '1s/^worktree //p')

if [ -z "$target_dir" ] || [ ! -d "$target_dir/.git" ]; then
    echo "Error: Could not determine the primary worktree directory."
    echo "Please manually switch to the primary worktree before removing this worktree."
    return 1 2>/dev/null || exit 1
fi

# Switch to the primary worktree
echo "Switching to '$target_dir'..."
cd "$target_dir" || { echo "Error: Could not change directory to '$target_dir'."; return 1 2>/dev/null || exit 1; }

# Checkout main branch and pull latest updates
echo "Checking out main branch..."
git checkout main || { echo "Error: Failed to checkout main branch."; return 1 2>/dev/null || exit 1; }

echo "Pulling latest updates..."
git pull || { echo "Warning: Failed to pull latest updates."; }

# Regenerate the Prisma client so it matches the (possibly newly migrated)
# schema. Otherwise the Husky pre-push hook ('bun run typecheck') fails with a
# non-zero exit code whenever a database migration changed the schema.
echo "Installing and generating Prisma client..."
bun install || { echo "Warning: Failed to install bun dependencies."; }
bunx prisma generate || { echo "Warning: Failed to generate Prisma client."; }

# Remove the worktree
echo "Removing worktree at '$current_dir'..."
git worktree remove "$current_dir"

if [ $? -ne 0 ]; then
    echo "Error: Failed to remove worktree. It might be dirty or locked."
    echo "You are currently in '$(pwd)'. Please check git worktree status."
    return 1 2>/dev/null || exit 1
else
    echo "Successfully removed worktree."
fi

# Prompt for local branch deletion
printf "Do you want to delete the local branch '$current_branch'? (y/N): "
read delete_local
if [[ "$delete_local" =~ ^[Yy]$ ]]; then
    git branch -D "$current_branch"
    if [ $? -eq 0 ]; then
        echo "Local branch '$current_branch' deleted."
    else
        echo "Warning: Failed to delete local branch '$current_branch'."
    fi
fi

# Prompt for remote branch deletion
printf "Do you want to delete the remote branch 'origin/$current_branch'? (y/N): "
read delete_remote
if [[ "$delete_remote" =~ ^[Yy]$ ]]; then
    git push origin --delete "$current_branch"
    if [ $? -eq 0 ]; then
        echo "Remote branch 'origin/$current_branch' deleted."
    else
        echo "Warning: Failed to delete remote branch 'origin/$current_branch'."
    fi
fi
