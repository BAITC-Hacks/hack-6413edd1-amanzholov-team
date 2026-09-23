$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Career Quest: http://127.0.0.1:8000' -ForegroundColor Magenta
python server.py
