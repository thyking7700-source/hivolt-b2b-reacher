# HIVOLT B2B Reacher — Windows RDP installer
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot
Write-Host "HIVOLT B2B REACHER  ·  Windows setup" -ForegroundColor Cyan
function Get-NodeMajor {
  try {
    $v = & node -v 2>$null
    if (-not $v) { return 0 }
    return [int]($v.TrimStart("v").Split(".")[0])
  } catch { return 0 }
}
$nodeMajor = Get-NodeMajor
if ($nodeMajor -lt 20) {
  Write-Host "Node.js 22+ is required. Trying winget..." -ForegroundColor Yellow
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  }
}
Write-Host "Installing project packages..." -ForegroundColor Cyan
npm install
node .\scripts\setup.mjs
Write-Host "Done. First screen is ACCESS TOKEN login." -ForegroundColor Green
Pause
