$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
docker compose -f backend/compose.yaml up --build -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Career Quest startup failed.' }
Write-Host 'HR: http://localhost:5173 | API: http://localhost:8000/docs' -ForegroundColor Magenta
Write-Host 'Employee: http://localhost:3000 | Login: employee' -ForegroundColor Cyan
Write-Host 'Login: hr. Password: DEMO_PASSWORD in backend/.env.'
