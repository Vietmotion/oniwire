Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dst = Join-Path $root "index.html"

# Release rule:
# 1) Find the newest root-level oniwire_v*.html by semantic version tokens.
# 2) Copy that file to index.html.
$versionFiles = @(Get-ChildItem -Path $root -File -Filter "oniwire_v*.html" |
  Where-Object { $_.Name -match '^oniwire_v(\d+)_(\d+)_(\d+)\.html$' } |
  ForEach-Object {
    [PSCustomObject]@{
      File = $_
      Major = [int]$Matches[1]
      Minor = [int]$Matches[2]
      Patch = [int]$Matches[3]
    }
  } |
  Sort-Object -Property @{ Expression = "Major"; Descending = $true }, @{ Expression = "Minor"; Descending = $true }, @{ Expression = "Patch"; Descending = $true })

if(-not $versionFiles -or $versionFiles.Count -eq 0){
  throw "No version files found in root (expected oniwire_vX_Y_Z.html)."
}

$src = $versionFiles[0].File.FullName
Copy-Item -Path $src -Destination $dst -Force
Write-Host "Synced index.html from $($versionFiles[0].File.Name)"
