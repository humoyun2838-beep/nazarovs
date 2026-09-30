@echo off
cd /d "%~dp0"
set "GIT=%~dp0.tools\mingit\cmd\git.exe"
set "GH=%~dp0.tools\gh\bin\gh.exe"

echo GitHubga kirish (brauzer ochiladi)...
"%GH%" auth login --hostname github.com --git-protocol https --web
if errorlevel 1 exit /b 1

echo Private repo nazarov-uz yaratiladi va push qilinadi...
"%GH%" repo create nazarov-uz --private --source=. --remote=origin --push
if errorlevel 1 exit /b 1

"%GH%" repo view --web
echo Tayyor. Railwayda shu GitHub repodan Import qiling.
pause
