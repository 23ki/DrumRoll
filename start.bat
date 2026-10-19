@echo off
chcp 65001 > nul
title DrumRoll Launcher
echo ========================================================
echo     DrumRoll - 簡易ドラム打ち込みソフト
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Pythonローカルサーバーを起動しています (ポート 3000)...
    echo ブラウザを開きます: http://localhost:3000
    start "" http://localhost:3000
    python -m http.server 3000
) else (
    echo [INFO] ブラウザで直接開きます...
    start "" "%~dp0index.html"
    pause
)
