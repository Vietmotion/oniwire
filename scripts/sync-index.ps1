Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "oniwire_v0_1_5.html"
$dst = Join-Path $root "index.html"

if(-not (Test-Path $src)){
  throw "Source file not found: $src"
}

Copy-Item -Path $src -Destination $dst -Force
Write-Host "Synced index.html from oniwire_v0_1_5.html"
