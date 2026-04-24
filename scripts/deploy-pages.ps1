param(
  [Parameter(Mandatory = $false)]
  [string]$Message = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Always sync index.html from the latest oniwire_vX_Y_Z.html before deploy.
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "sync-index.ps1")

if([string]::IsNullOrWhiteSpace($Message)){
  $latest = @(Get-ChildItem -Path $root -File -Filter "oniwire_v*.html" |
    Where-Object { $_.Name -match '^oniwire_v(\d+)_(\d+)_(\d+)\.html$' } |
    Sort-Object Name -Descending |
    Select-Object -First 1)

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  if($latest){
    $Message = "deploy: sync index from $($latest.Name) | $stamp"
  } else {
    $Message = "deploy: sync index | $stamp"
  }
}

# Stage all local changes intentionally for a deploy release.
git add -A

# Commit only when there is something staged.
git diff --cached --quiet
if($LASTEXITCODE -ne 0){
  git commit -m $Message
} else {
  Write-Host "No staged changes to commit."
}

git push origin main

git status -sb
Write-Host "Deploy workflow completed."
