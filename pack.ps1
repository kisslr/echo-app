$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stage = Join-Path $root ".submission_stage"
$zipPath = Join-Path $root "echo-app-submission.zip"

if ((Resolve-Path -LiteralPath $root).Path -ne "D:\echo-app") {
    Write-Host "当前脚本目录不是 D:\echo-app，仍将按脚本所在目录打包: $root"
}

if (Test-Path -LiteralPath $stage) {
    Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Path $stage | Out-Null

$files = @(
    "app.py",
    "requirements.txt",
    "install.bat",
    "start.bat",
    "pack.bat",
    "pack.ps1",
    "README.md",
    "SELFCHECK.md",
    "test_api.py",
    ".env.example",
    ".gitignore",
    ".dockerignore",
    "Dockerfile",
    "PPT生成Prompt.txt"
)

foreach ($file in $files) {
    $src = Join-Path $root $file
    if (Test-Path -LiteralPath $src) {
        Copy-Item -LiteralPath $src -Destination (Join-Path $stage $file) -Force
    }
}

$dirs = @(
    "templates",
    "static",
    "android-bridge",
    "android-apk",
    "deploy",
    ".github"
)

foreach ($dir in $dirs) {
    $src = Join-Path $root $dir
    if (Test-Path -LiteralPath $src) {
        Copy-Item -LiteralPath $src -Destination (Join-Path $stage $dir) -Recurse -Force
    }
}

New-Item -ItemType Directory -Path (Join-Path $stage "data") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "uploads") -Force | Out-Null
Set-Content -LiteralPath (Join-Path $stage "data\.gitkeep") -Value "" -NoNewline -Encoding UTF8
Set-Content -LiteralPath (Join-Path $stage "uploads\.gitkeep") -Value "" -NoNewline -Encoding UTF8

$blockedPatterns = @(
    ".env",
    "data\echo.db",
    "echo-app-submission.zip",
    "__pycache__",
    "*.pyc",
    "复赛备战计划.md",
    ".submission_stage"
)

foreach ($pattern in $blockedPatterns) {
    $matches = Get-ChildItem -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*\$pattern" -or $_.Name -like $pattern }
    foreach ($match in $matches) {
        Remove-Item -LiteralPath $match.FullName -Recurse -Force
    }
}

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $stage -Recurse -Force

Write-Host "已生成: $zipPath"
