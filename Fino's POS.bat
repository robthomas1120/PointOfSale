@echo off
cd /d D:\Documents\GitHub\PointOfSale
call .venv\Scripts\activate.bat

rem Start the Python server in the background
start /b python app.py

rem Now, open Chrome to print the page and wait for Chrome to exit
start /wait "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing http://127.0.0.1:5000/

rem After Chrome is closed, terminate the Python process
taskkill /f /im python.exe

rem Exit the terminal
exit
