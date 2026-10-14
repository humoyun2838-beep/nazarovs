@echo off
cd /d "%~dp0"
set "GIT=%~dp0.tools\mingit\cmd\git.exe"
set "GH=%~dp0.tools\gh\bin\gh.exe"

echo.
echo 1) Brauzerda GitHub token ochiladi.
echo 2) Generate new token (classic) bosing.
echo 3) Note: nazarov  Expiration: 90 days
echo 4) Scope: repo  ni belgilang, Generate token, keyin NUSXA oling.
echo.
start "" "https://github.com/settings/tokens/new?scopes=repo,read:org&description=nazarov-uz"
echo Tokenni shu yerga joylang (ekranda ko'rinmaydi) va Enter bosing.
set /p TOKEN="GitHub token: "
if "%TOKEN%"=="" (
  echo Token bo'sh.
  pause
  exit /b 1
)

echo %TOKEN%| "%GH%" auth login --hostname github.com --git-protocol https --with-token
if errorlevel 1 (
  echo Login token bilan ham chiqmadi. Tokenni qayta yarating: repo huquqi bo'lsin.
  pause
  exit /b 1
)

"%GH%" auth setup-git
echo.
echo Private repo yaratiladi...
"%GH%" repo create nazarov-uz --private --source=. --remote=origin --push
if errorlevel 1 (
  echo Repo yaratilmadi. Ehtimol nazarov-uz allaqachon bor.
  echo GitHubda New repository ochib, URL ni yozing.
  set /p ORIGIN="Repo URL (https://github.com/LOGIN/nazarov-uz.git): "
  "%GIT%" remote remove origin 2>nul
  "%GIT%" remote add origin %ORIGIN%
  "%GIT%" push -u origin main
)

"%GH%" repo view --web
echo Tayyor.
pause
