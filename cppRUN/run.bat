@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
cl /EHsc /W0 /O2 /MD run.cpp /Fe:run.exe >nul 2>&1
run.exe
echo.
echo.
pause