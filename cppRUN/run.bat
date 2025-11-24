@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
set "BUILD_LOG=%TEMP%\run_build.log"

cl /EHsc /W0 /O2 /MD run.cpp /Fe:run.exe >"%BUILD_LOG%" 2>&1
if errorlevel 1 (
	type "%BUILD_LOG%"
	echo.
	echo === 컴파일 실패: 위 메시지를 확인하세요 ===
	if exist "%BUILD_LOG%" del "%BUILD_LOG%"
	pause
	exit /b 1
)
if exist "%BUILD_LOG%" del "%BUILD_LOG%"

run.exe
pause