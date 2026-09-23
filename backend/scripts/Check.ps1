param([string]$TestDatabaseUrl = $env:TEST_DATABASE_URL)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    if (-not $TestDatabaseUrl) { throw 'Set TEST_DATABASE_URL to a separate PostgreSQL database ending in _test.' }
    $env:TEST_DATABASE_URL = $TestDatabaseUrl
    & uv sync --locked
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & uv run ruff check src tests
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & uv run ruff format --check src tests
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & uv run mypy src
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & uv run pytest
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
