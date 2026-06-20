#
# fix-redirects.ps1
# One-time fix: delete _redirects from the main branch on GitHub.
# This file was accidentally added via the GitHub web editor and is
# causing ERR_FAILED on login.html (SPA rule serves index.html for ALL
# paths, including /login.html, creating an infinite redirect loop).
#

$Dest = "C:\Users\rosek\OneDrive\Documents\GitHub\SAFE-Learning-Spot"

function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "    [X]  $msg" -ForegroundColor Red }
function Write-Warn { param($msg) Write-Host "    [!]  $msg" -ForegroundColor Yellow }

Write-Step "Changing to repo folder"
if (-not (Test-Path $Dest)) {
    Write-Fail "Repo folder not found: $Dest"
    Read-Host "Press Enter to exit"; exit 1
}
Set-Location $Dest
Write-OK "In: $Dest"

Write-Step "Fetching latest from remote"
git fetch origin
Write-OK "Fetched"

Write-Step "Switching to main branch and pulling"
git checkout main 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    # If local main doesn't exist, track origin/main
    git checkout -b main --track origin/main 2>&1 | Out-Null
}
git pull origin main --no-rebase 2>&1
Write-OK "On main, up to date"

Write-Step "Checking for _redirects"
if (Test-Path "_redirects") {
    Remove-Item "_redirects" -Force
    Write-OK "Deleted _redirects from disk"
} else {
    Write-Warn "_redirects not on disk (was only on remote — removing from git index)"
}

git rm --cached _redirects 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "Removed _redirects from git tracking"
} else {
    Write-Warn "git rm --cached returned non-zero — file may already be untracked"
}

Write-Step "Committing deletion"
git status --short
$status = git status --porcelain
if ($status) {
    git commit -m "Remove _redirects — breaks multi-page site (SPA rule causes ERR_FAILED on login.html)"
    Write-OK "Committed"
} else {
    Write-Warn "Nothing to commit — _redirects may already be absent from this branch"
}

Write-Step "Pushing to origin/main"
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-OK "Pushed! Cloudflare will now rebuild without the broken redirect rule."
    Write-Host "`n    View repo: https://github.com/hughmupfigo-star/SAFE-Learning-Spot" -ForegroundColor Cyan
    Write-Host "    Check site: https://safelearningspot.com/login.html" -ForegroundColor Cyan
} else {
    Write-Fail "Push failed — see error above"
}

Write-Host ""
Read-Host "Press Enter to close"
