$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$nodeDir = Join-Path $root ".tools\node-v22.20.0-win-x64"
if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
  Write-Error "Node topilmadi: $nodeDir"
}
$env:Path = "$nodeDir;" + $env:Path
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
Write-Host "Sayt: http://127.0.0.1:3847/nazarov"
Write-Host "Admin: http://127.0.0.1:3847/admin/login  (Nazarov / admin9915504)"
npm run start
