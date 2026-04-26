---
name: git-commit-push-skill
description: >-
  Git commit and push tool for LLM agents. Stage files, commit changes, and push
  to GitHub repositories. IMPORTANT: This skill must ONLY be invoked when the
  user EXPLICITLY asks to commit, push, or save changes to git. Never
  auto-trigger or suggest this skill unprompted.
---

# Git Commit and Push Skill

This skill provides a comprehensive git workflow tool for LLM agents to commit and push code changes to GitHub repositories.

## ⚠️ CRITICAL USAGE RULE — DO NOT AUTO-TRIGGER

**This skill must ONLY be used when the user EXPLICITLY and DIRECTLY asks you to commit, push, or save their work to git.**

Examples of valid triggers (ONLY these):
- "commit and push my changes"
- "commit this"
- "push to github"
- "save my work"
- "git commit"
- Any other direct, intentional request from the user to commit/push

**NEVER do any of the following:**
- ❌ Do NOT auto-commit after making code changes
- ❌ Do NOT suggest committing unless the user asks
- ❌ Do NOT commit "as a convenience" or "to save progress"
- ❌ Do NOT push without the user explicitly saying so
- ❌ Do NOT assume the user wants to commit, even if there are uncommitted changes

If you are unsure, **DO NOTHING**. Wait for the user to explicitly ask.

## Features

- 📁 Stage specific files or all changes
- 💾 Create descriptive commits with conventional commit format
- 🚀 Push changes to remote repositories
- 👤 Configure git author information for commits
- 🔍 Validate repository paths and check for changes
- 🛡️ Error handling with detailed feedback

## Setup

### Prerequisites

- Python 3.7+
- Git installed and configured on the system
- GitPython package: `pip install gitpython`

### Installation

The skill will be automatically loaded when placed in the skills directory.

## Usage

### Via Agent

Simply ask the agent to commit and push your changes:

```
Commit all changes to main branch with message "feat: add user authentication"
```

Or specify specific files:

```
Commit only src/main.py and README.md with message "fix: resolve login bug"
```

### Tool Parameters

The `git_commit_and_push` tool accepts:

#### Required Parameters
- `repo_path` (string): Full path to the local repository folder
- `commit_message` (string): Clear, descriptive commit message

#### Optional Parameters
- `files_to_add` (array): List of specific files to stage (if None, adds all changes)
- `branch` (string): Target branch (default: "main")
- `remote_name` (string): Remote name (default: "origin")
- `push` (boolean): Whether to push after commit (default: true)
- `user_name` (string): Git author name (optional)
- `user_email` (string): Git author email (optional)

## Examples

### Basic Usage
```python
# Commit all changes
git_commit_and_push(
    repo_path="/path/to/your/repo",
    commit_message="feat: add new feature"
)
```

### Commit Specific Files
```python
# Commit only specific files
git_commit_and_push(
    repo_path="/path/to/your/repo",
    commit_message="fix: resolve bug in authentication",
    files_to_add=["src/auth.py", "tests/test_auth.py"]
)
```

### Configure Author
```python
# Set custom author for commits
git_commit_and_push(
    repo_path="/path/to/your/repo",
    commit_message="docs: update README",
    user_name="LLM Agent",
    user_email="agent@example.com"
)
```

### Push to Different Branch
```python
# Push to develop branch
git_commit_and_push(
    repo_path="/path/to/your/repo",
    commit_message="feat: add payment processing",
    branch="develop"
)
)
```

## Security Best Practices

### GitHub Authentication

**Option 1: SSH Keys (Recommended)**
```bash
# Configure SSH keys
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add public key to GitHub account
```

**Option 2: Personal Access Token**
```bash
# Set environment variable
export GITHUB_TOKEN="your_token_here"
# Or use fine-grained token with repo scope only
```

### Repository Setup

1. Always clone the repository first:
```bash
git clone https://github.com/username/repo.git
# or
git clone git@github.com:username/repo.git
```

2. Verify git configuration:
```bash
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
```

## Conventional Commit Format

Use conventional commits for better commit history:

```
feat: add new authentication system
fix: resolve memory leak in database connection
docs: update API documentation
style: format code according to PEP8
refactor: optimize database queries
test: add unit tests for user model
chore: update dependencies to latest versions
```

## Error Handling

The tool provides detailed error messages:

- **Repository not found**: Check if the path exists and contains a .git directory
- **No changes to commit**: Use `git status` to check what changes are staged
- **Push failed**: Verify remote URL, authentication, and branch name
- **Git command error**: Check git configuration and permissions

## Troubleshooting

### Common Issues

**"Repository path not found"**
- Verify the path exists
- Ensure it's a git repository (contains .git folder)

**"No changes to commit"**
- Use `git status` to check for uncommitted changes
- Try `git add -A` to stage all changes

**Push authentication failed**
- Verify SSH key is added to GitHub or token is valid
- Check remote URL configuration

### Debug Mode

For detailed debugging, enable git verbose output:
```python
git_commit_and_push(
    repo_path="/path/to/repo",
    commit_message="debug test",
    push=True
)
```

## Integration

### With Other Skills

This skill works well with other pi skills like:
- Code editing skills
- File management skills
- Project analysis skills

### Agent Workflow

1. Use other skills to make code changes
2. Review changes with `git status`
3. Call `git_commit_and_push` with appropriate message
4. Verify success message from tool output

## API Reference

### git_commit_and_push()

```python
def git_commit_and_push(
    repo_path: str,
    commit_message: str,
    files_to_add: Optional[List[str]] = None,
    branch: str = "main",
    remote_name: str = "origin",
    push: bool = True,
    user_name: Optional[str] = None,
    user_email: Optional[str] = None
) -> str
```

**Returns:** Success message with commit details or error message

**Raises:** GitCommandError for git-related errors, Exception for unexpected errors