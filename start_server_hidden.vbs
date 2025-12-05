Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""D:\Hamed\Project\Anbar-Daru"" && python run_server.py", 0, False
Set WshShell = Nothing
