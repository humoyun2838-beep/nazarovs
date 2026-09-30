$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$git = Join-Path $root ".tools\mingit\cmd\git.exe"
$gh = Join-Path $root ".tools\gh\bin\gh.exe"

Write-Host "GitHubga kirish (brauzer ochiladi)..."
& $gh auth login --hostname github.com --git-protocol https --web
if ($LASTEXITCODE -ne 0) { throw "GitHub login failed" }

Write-Host "Private repo nazarov-uz yaratiladi va push qilinadi..."
& $gh repo create nazarov-uz --private --source=. --remote=origin --push
if ($LASTEXITCODE -ne 0) { throw "Repo create/push failed" }

& $gh repo view --web
Write-Host "Tayyor. Railwayda shu GitHub repodan Import qiling."
