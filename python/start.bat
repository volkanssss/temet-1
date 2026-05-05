@echo off
echo Temettü Takip - Fiyat Sunucusu
echo ================================
cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: Python bulunamadi. Python yukleyin ve PATH'e ekleyin.
    pause
    exit /b 1
)

pip install -r requirements.txt --quiet
echo Sunucu baslatiliyor: http://localhost:8000
python main.py
pause
