@echo off
chcp 65001 >nul
title 一造学习计划
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo 没有检测到 Node.js。
  echo 请先安装 Node.js LTS: https://nodejs.org/
  echo 安装完成后重新双击本文件。
  echo.
  pause
  exit /b 1
)

echo 正在启动一造学习计划...
echo 浏览器会自动打开 http://127.0.0.1:4173
echo 关闭本窗口即可停止服务。
echo.
node server.js
pause
