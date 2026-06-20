<#
.SYNOPSIS
    Sync Safe Learning Spot Centre → GitHub

.DESCRIPTION
    1. Copies all site files from your working folder (safelearningspotcentre)
       to the GitHub repo folder (SAFE-Learning-Spot), skipping secrets.
    2. Runs a pre-push secrets scan — aborts if anything looks exposed.
    3. Commits with a timestamp message and pushes to GitHub.

.USAGE
    Right-click this file → "Run with PowerShell"
    OR in a terminal: .\push-to-github.ps1
    OR with a custom message: .\push-to-github.ps1 -Message "Add new module"
#>

param(
    [string]$Message = ""
)

# ── Configuration ──────────────────────────────────────────────────────────────
$Source = "C:\Users\rosek\Downloads\safelearningspotcentre"
$Dest   = "C:\Users\rosek\OneDrive\Documents\GitHub\SAFE-Learning-Spot"
$Remote = "https://github.com/hughmupfigo-star/SAFE-Learning-Spot.git"

# Files/folders to NEVER copy or commit
$Exclude = @(
    ".env", ".env.*", "*.env", ".env.local", ".env.txt",
    "node_modules", "dist", "build", ".cache",
    "debug-users.js", "verify-setup.js", "check-env.js",
    "*.log", ".DS_Store", "Thumbs.db", "*.swp"
)

# Patterns that suggest a real secret is exposed in a file
$SecretPatterns = @(
    '(?i)password\s*=\s*[^\$\s\{][^\s]{5,}',   # password=something (not placeholder)
    '(?i)secret\s*=\s*[^\$\s\{][^\s]{8,}',      # secret=something real
    '(?i)DATABASE_URL\s*=\s*postgresql://',       # hardcoded DB connection string
    '(?i)sk_live_[A-Za-z0-9]{20,}',              # Stripe live secret key
    '(?i)pk_live_[A-Za-z0-9]{20,}',              # Stripe live public key
    '(?i)AIza[0-9A-Za-z\-_]{35}',               # Google API key
    '(?i)ghp_[A-Za-z0-9]{36}',                   # GitHub personal access token
    '(?i)-----BEGIN (RSA |EC )?PRIVATE KEY-----' # Private key block
)

# ── Helpers ────────────────────────────────────────────────────────────────────
function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "    [!]  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "    [X]  $msg" -ForegroundColor Red }

function Should-Exclude($name) {
    foreach ($pat in $Exclude) {
        if ($name -like $pat) { return $true }
    }
    return $false
}

# ── Step 1: Verify source folder ───────────────────────────────────────────────
Write-Step "Checking source folder"
if (-not (Test-Path $Source)) {
    Write-Fail "Source folder not found: $Source"
    Read-Host "Press Enter to exit"; exit 1
}
Write-OK "Source: $Source"

# ── Step 2: Create destination folder if needed ────────────────────────────────
Write-Step "Preparing destination folder"
if (-not (Test-Path $Dest)) {
    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    Write-OK "Created: $Dest"
} else {
    Write-OK "Destination exists: $Dest"
}

# ── Step 3: Copy files (respecting exclusions) ────────────────────────────────
Write-Step "Copying files (excluding secrets & dev artefacts)"
$copied = 0
$skipped = 0

Get-ChildItem -Path $Source -Recurse | ForEach-Object {
    $rel = $_.FullName.Substring($Source.Length).TrimStart('\','/')

    # Skip any path segment that matches an exclusion
    $skip = $false
    foreach ($seg in $rel.Split('\','/')) {
        if (Should-Exclude $seg) { $skip = $true; break }
    }

    if ($skip) {
        $skipped++
        return
    }

    $target = Join-Path $Dest $rel

    if ($_.PSIsContainer) {
        if (-not (Test-Path $target)) {
            New-Item -ItemType Directory -Path $target -Force | Out-Null
        }
    } else {
        $targetDir = Split-Path $target -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $target -Force
        $copied++
    }
}

Write-OK "Copied $copied files  |  Skipped $skipped excluded items"

# ── Step 4: Copy / overwrite .gitignore ───────────────────────────────────────
Write-Step "Installing .gitignore"
Copy-Item -Path (Join-Path $Source ".gitignore") -Destination (Join-Path $Dest ".gitignore") -Force
Write-OK ".gitignore installed"

# ── Step 5: Pre-push secrets scan ─────────────────────────────────────────────
Write-Step "Running secrets scan on destination"
$scanFiles = Get-ChildItem -Path $Dest -Recurse -File | Where-Object {
    $_.Extension -in @('.js','.html','.json','.ts','.env','.txt','.sh','.ps1','.bat','.yml','.yaml') -and
    $_.FullName -notlike "*\node_modules\*"
}

$issues = @()
foreach ($f in $scanFiles) {
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    foreach ($pat in $SecretPatterns) {
        if ($content -match $pat) {
            $issues += "$($f.FullName) — matched pattern: $pat"
        }
    }
}

if ($issues.Count -gt 0) {
    Write-Fail "SECRETS SCAN FAILED — potential secrets detected:"
    foreach ($i in $issues) { Write-Fail "  $i" }
    Write-Warn ""
    Write-Warn "Fix these before pushing. Your .env file with real credentials must"
    Write-Warn "stay in .gitignore and NEVER be copied to the destination folder."
    Read-Host "`nPress Enter to exit without pushing"; exit 1
} else {
    Write-OK "No exposed secrets detected"
}

# ── Step 6: Git init + remote ─────────────────────────────────────────────────
Write-Step "Setting up Git repository"
Set-Location $Dest

if (-not (Test-Path (Join-Path $Dest ".git"))) {
    git init
    Write-OK "Git repository initialised"
} else {
    Write-OK "Git repository already exists"
}

# Set remote (replace if already set)
git remote remove origin 2>$null
git remote add origin $Remote
Write-OK "Remote set: $Remote"

# ── Step 7: Stage, commit, push ───────────────────────────────────────────────
Write-Step "Committing changes"
git add .

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
if ($Message -eq "") {
    $commitMsg = "Update Safe Learning Spot Centre — $timestamp"
} else {
    $commitMsg = "$Message — $timestamp"
}

$status = git status --porcelain
if ($status) {
    git commit -m $commitMsg
    Write-OK "Committed: $commitMsg"
} else {
    Write-Warn "Nothing new to commit — files are up to date"
}

Write-Step "Pushing to GitHub"
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-OK "Push successful!"
    Write-Host "`n    View your repo at: https://github.com/hughmupfigo-star/SAFE-Learning-Spot" -ForegroundColor Cyan
} else {
    Write-Warn "Push failed. If you see 'fetch first', run:"
    Write-Warn "    cd `"$Dest`""
    Write-Warn "    git pull origin main --rebase"
    Write-Warn "Then run this script again."
}

Write-Host ""
Read-Host "Press Enter to close"
