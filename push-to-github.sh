#!/bin/bash

echo "🚀 RavanOS Chat - GitHub Push Script"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d ".git" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Repository Information:"
echo "  - Repository: https://github.com/Ravana-indus/ravanmcp-chat.git"
echo "  - Branch: main"
echo "  - Files: $(git ls-files | wc -l) files committed"
echo ""

echo "🔐 GitHub Authentication Required"
echo "Please ensure you have GitHub credentials configured:"
echo ""
echo "Option 1: Personal Access Token (Recommended)"
echo "  git config credential.helper store"
echo "  git push -u origin main"
echo "  # When prompted, use your GitHub username and Personal Access Token"
echo ""
echo "Option 2: SSH Key (if configured)"
echo "  git remote set-url origin git@github.com:Ravana-indus/ravanmcp-chat.git"
echo "  git push -u origin main"
echo ""
echo "Option 3: GitHub CLI (if installed)"
echo "  gh auth login"
echo "  git push -u origin main"
echo ""

echo "📁 Current Git Status:"
git status --short
echo ""

echo "📝 Recent Commits:"
git log --oneline -3
echo ""

echo "🌐 To verify after pushing, visit:"
echo "  https://github.com/Ravana-indus/ravanmcp-chat"
echo ""

echo "✅ Project is ready to push!"
echo "Run one of the authentication methods above, then:"
echo "  git push -u origin main" 