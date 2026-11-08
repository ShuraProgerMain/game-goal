; Дополнения к установщику Tauri (NSIS): команда gg и переезд с версии на Electron

!macro NSIS_HOOK_PREINSTALL
  ; Версия на Electron (1.x): её процесс, автозапуск и рантайм. Данные в %APPDATA%\game-goal остаются —
  ; новая версия читает их из той же папки
  nsExec::Exec 'taskkill /F /IM GameGoal.exe'
  Delete "$SMSTARTUP\Game Goal.lnk"
  RMDir /r "$LOCALAPPDATA\GameGoal"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GameGoal"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Команда gg: папка WindowsApps уже есть в PATH у каждого пользователя Windows 10/11
  FileOpen $0 "$LOCALAPPDATA\Microsoft\WindowsApps\gg.cmd" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'rem Game Goal: gg, gg settings, gg stats, gg add 1500 за превью @Вася$\r$\n'
  FileWrite $0 '"$INSTDIR\${MAINBINARYNAME}.exe" %*$\r$\n'
  FileWrite $0 'if not "%~1"=="" echo OK: %*$\r$\n'
  FileClose $0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$LOCALAPPDATA\Microsoft\WindowsApps\gg.cmd"
  ; автозапуск, который включает сама программа
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Game Goal"
!macroend
