<#
  Game Goal — установщик (по шаблону windows-app-deploy).
  Без прав администратора, для текущего пользователя. Повторный запуск — обновление.

  Установка: двойной клик по install.cmd в папке программы.
  Удаление:  install.cmd -Uninstall или «Установка и удаление программ».

  Программа остаётся в своей папке. Рантайм Electron — в %LOCALAPPDATA%\GameGoal\runtime
  (копируется из node_modules, если он там есть, иначе скачивается с GitHub). Данные — в %APPDATA%\game-goal.
#>
param(
    [switch]$Uninstall,
    [string]$Source  # папка с программой; install.cmd передаёт свою
)

# ---------- настройки ----------

$AppName   = 'Game Goal'
$LegacyName = 'Копилка на игру'   # прежнее имя: его ярлыки убираем
$LegacyCommand = 'kopilka'
$AppId     = 'GameGoal'
$Publisher = 'game-goal'
$Command   = 'gg'
$Done      = @'
Готово. Виджет на рабочем столе, значок в трее.
  «Пуск» → «Game Goal»   — показать виджет (если он уже виден — откроются настройки)
  gg                      — то же из терминала
  gg add 1500 за превью   — добавить доход
  gg settings             — настройки
'@

# ---------- дальше обычно менять не нужно ----------

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Data = Join-Path $env:LOCALAPPDATA $AppId            # рантайм и лаунчер
$Runtime = Join-Path $Data 'runtime'
$Exe = Join-Path $Runtime "$AppId.exe"
$UserData = Join-Path $env:APPDATA 'game-goal'        # данные программы (имя из package.json)
$Programs = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$MenuLnk = Join-Path $Programs "$AppName.lnk"
$AutoLnk = Join-Path $Programs "Startup\$AppName.lnk"
$LegacyLnks = @((Join-Path $Programs "$LegacyName.lnk"), (Join-Path $Programs "Startup\$LegacyName.lnk"))
$StrayLnk = Join-Path $Programs 'Electron.lnk'  # его создаёт сам Electron, пока в exe имя «Electron»
$UninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppId"

function Step($text) { Write-Host "`n$text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  + $text" -ForegroundColor Green }
function Note($text) { Write-Host "  $text" -ForegroundColor DarkGray }

function Invoke-Native {
    # внешняя программа: её stderr не должен превращаться в ошибку PowerShell
    param([string]$Exe, [string[]]$Arguments)
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Exe @Arguments 2>$null } finally { $ErrorActionPreference = $old }
}

function Stop-App {
    # только свои процессы: рантайм программы и Electron из node_modules, запущенный с этой папкой
    $own = {
        Get-CimInstance Win32_Process -Filter "Name='$AppId.exe' OR Name='electron.exe'" |
            Where-Object {
                ($_.ExecutablePath -and $_.ExecutablePath -like "$Runtime\*") -or
                ($App -and $_.CommandLine -and $_.CommandLine -like "*$App*")
            }
    }
    & $own | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    # дождаться, пока процессы Electron (их несколько) отпустят свои файлы
    for ($i = 0; $i -lt 50 -and (& $own); $i++) { Start-Sleep -Milliseconds 100 }
    Start-Sleep -Milliseconds 300
}

function Edit-UserPath([string[]]$Remove, [string]$Add) {
    # через реестр, не раскрывая %переменные% чужих записей
    $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
    $norm = { param($p) $p.TrimEnd('\').ToLowerInvariant() }
    $drop = @($Remove + $Add | Where-Object { $_ } | ForEach-Object { & $norm $_ })
    $parts = @($key.GetValue('Path', '', 'DoNotExpandEnvironmentNames') -split ';' |
        Where-Object { $_ -and ($drop -notcontains (& $norm ([Environment]::ExpandEnvironmentVariables($_)))) })
    if ($Add) { $parts += $Add }
    $key.SetValue('Path', ($parts -join ';'), 'ExpandString')
    $key.Close()
    # оповестить Windows (WM_SETTINGCHANGE), чтобы новые окна терминала увидели PATH
    [Environment]::SetEnvironmentVariable("$($AppId)_TMP", '1', 'User')
    [Environment]::SetEnvironmentVariable("$($AppId)_TMP", $null, 'User')
}

function Use-EnvVars([string]$Path) {
    # в .cmd пути через переменные — не ломаются на кириллице и пробелах в имени пользователя
    $Path.Replace($env:LOCALAPPDATA, '%LOCALAPPDATA%').Replace($env:APPDATA, '%APPDATA%').Replace($env:USERPROFILE, '%USERPROFILE%')
}

function Write-Cmd([string]$Path, [string]$Text) {
    # .cmd — в OEM-кодировке консоли, иначе кириллица в путях превращается в мусор
    $oem = [Text.Encoding]::GetEncoding([Globalization.CultureInfo]::CurrentCulture.TextInfo.OEMCodePage)
    [IO.File]::WriteAllText($Path, $Text, $oem)
}

function Remove-StrayShortcut {
    # только если ярлык ведёт на наш exe: чужой «Electron.lnk» (другой программы) не трогаем
    if ((Test-Path $StrayLnk) -and (New-Object -ComObject WScript.Shell).CreateShortcut($StrayLnk).TargetPath -eq $Exe) {
        Remove-Item $StrayLnk -Force
    }
}

function New-Shortcut([string]$Path, [string]$Target, [string]$Arguments, [string]$WorkDir, [string]$IconPath, [string]$Description) {
    # WScript.Shell не сохраняет ярлык с кириллицей в имени, если её нет в ANSI-кодировке системы:
    # сохраняем под латинским именем и переименовываем
    $tmp = Join-Path $env:TEMP "$AppId-$([guid]::NewGuid().ToString('N')).lnk"
    $lnk = (New-Object -ComObject WScript.Shell).CreateShortcut($tmp)
    $lnk.TargetPath = $Target
    $lnk.Arguments = $Arguments
    $lnk.WorkingDirectory = $WorkDir
    $lnk.IconLocation = $IconPath
    $lnk.Description = $Description
    $lnk.Save()
    New-Item -ItemType Directory -Force (Split-Path $Path) | Out-Null
    Move-Item $tmp $Path -Force
}

function Set-ExeStrings([string]$Path, [hashtable]$Strings) {
    # Переписывает строки в ресурсе версии exe (FileDescription, ProductName…) через UpdateResource.
    # Ресурс разбирается деревом и собирается заново: длины узлов пересчитываются сами.
    if (-not ('ExeVersion' -as [type])) {
        Add-Type -TypeDefinition @'
using System; using System.Collections.Generic; using System.IO; using System.Runtime.InteropServices; using System.Text;
public static class ExeVersion {
  [DllImport("kernel32", SetLastError=true, CharSet=CharSet.Unicode)] static extern IntPtr LoadLibraryEx(string f, IntPtr h, uint fl);
  [DllImport("kernel32")] static extern bool FreeLibrary(IntPtr h);
  [DllImport("kernel32", SetLastError=true)] static extern IntPtr FindResourceEx(IntPtr m, IntPtr type, IntPtr name, ushort lang);
  [DllImport("kernel32")] static extern IntPtr LoadResource(IntPtr m, IntPtr r);
  [DllImport("kernel32")] static extern IntPtr LockResource(IntPtr r);
  [DllImport("kernel32")] static extern uint SizeofResource(IntPtr m, IntPtr r);
  [DllImport("kernel32", SetLastError=true, CharSet=CharSet.Unicode)] static extern IntPtr BeginUpdateResource(string f, bool del);
  [DllImport("kernel32", SetLastError=true)] static extern bool UpdateResource(IntPtr h, IntPtr type, IntPtr name, ushort lang, byte[] d, uint n);
  [DllImport("kernel32", SetLastError=true)] static extern bool EndUpdateResource(IntPtr h, bool discard);

  class Node { public string Key; public ushort Type; public byte[] Value; public List<Node> Kids = new List<Node>(); }

  static int Pad(int n) { return (n + 3) & ~3; }
  static Node Parse(byte[] b, int at) {
    int len = BitConverter.ToUInt16(b, at), vlen = BitConverter.ToUInt16(b, at + 2);
    var n = new Node { Type = BitConverter.ToUInt16(b, at + 4) };
    int p = at + 6, s = p;
    while (BitConverter.ToUInt16(b, p) != 0) p += 2;
    n.Key = Encoding.Unicode.GetString(b, s, p - s);
    p = Pad(p + 2);  // ресурс начинается с нуля, выравнивание от начала буфера
    int vbytes = n.Type == 1 ? vlen * 2 : vlen;
    if (vbytes > at + len - p) vbytes = Math.Max(0, at + len - p);
    n.Value = new byte[vbytes]; Array.Copy(b, p, n.Value, 0, vbytes);
    p = Pad(p + vbytes);
    while (p < at + len) { var k = Parse(b, p); n.Kids.Add(k); p += Pad(BitConverter.ToUInt16(b, p)); }
    return n;
  }
  static byte[] Build(Node n) {
    var m = new MemoryStream(); var w = new BinaryWriter(m);
    w.Write((ushort)0); w.Write((ushort)(n.Type == 1 ? n.Value.Length / 2 : n.Value.Length)); w.Write(n.Type);
    w.Write(Encoding.Unicode.GetBytes(n.Key + "\0"));
    while (m.Length % 4 != 0) w.Write((byte)0);
    w.Write(n.Value);
    foreach (var k in n.Kids) { while (m.Length % 4 != 0) w.Write((byte)0); w.Write(Build(k)); }
    var r = m.ToArray(); BitConverter.GetBytes((ushort)r.Length).CopyTo(r, 0);
    return r;
  }

  public static void Set(string path, string[] keys, string[] values) {
    IntPtr mod = LoadLibraryEx(path, IntPtr.Zero, 0x2 | 0x20);  // как данные, без запуска кода
    if (mod == IntPtr.Zero) throw new Exception("не открыть " + path);
    byte[] data; ushort lang = 0;
    try {
      IntPtr res = IntPtr.Zero;
      foreach (ushort l in new ushort[] { 1033, 0, 1049 }) { res = FindResourceEx(mod, (IntPtr)16, (IntPtr)1, l); if (res != IntPtr.Zero) { lang = l; break; } }
      if (res == IntPtr.Zero) throw new Exception("в exe нет ресурса версии");
      data = new byte[SizeofResource(mod, res)];
      Marshal.Copy(LockResource(LoadResource(mod, res)), data, 0, data.Length);
    } finally { FreeLibrary(mod); }
    var root = Parse(data, 0);
    foreach (var sfi in root.Kids) if (sfi.Key == "StringFileInfo")
      foreach (var table in sfi.Kids) {
        for (int i = 0; i < keys.Length; i++) {
          var s = table.Kids.Find(k => k.Key == keys[i]);
          if (s == null) { s = new Node { Key = keys[i], Type = 1 }; table.Kids.Add(s); }
          s.Value = Encoding.Unicode.GetBytes(values[i] + "\0");
        }
      }
    var outData = Build(root);
    IntPtr h = BeginUpdateResource(path, false);
    if (h == IntPtr.Zero) throw new Exception("exe занят или защищён от записи: " + path);
    if (!UpdateResource(h, (IntPtr)16, (IntPtr)1, lang, outData, (uint)outData.Length)) { EndUpdateResource(h, true); throw new Exception("UpdateResource: " + Marshal.GetLastWin32Error()); }
    if (!EndUpdateResource(h, false)) throw new Exception("EndUpdateResource: " + Marshal.GetLastWin32Error());
  }
}
'@
    }
    [ExeVersion]::Set($Path, [string[]]$Strings.Keys, [string[]]$Strings.Values)
}

# ---------- запуск изнутри упакованного приложения ----------

# Если установщик запустили из MSIX-приложения (например, Claude Desktop), Windows молча перенаправляет
# записи в %LOCALAPPDATA%, %APPDATA% и HKCU в песочницу этого приложения: ярлыки потом ведут в пустоту.
# Проверяем пробным файлом и в этом случае перезапускаемся вне песочницы через WMI.
$probeName = "$AppId-probe-$([guid]::NewGuid().ToString('N'))"
$probe = Join-Path $env:LOCALAPPDATA $probeName
[IO.File]::WriteAllText($probe, '1')
$virtual = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Packages\*\LocalCache\Local\$probeName") -ErrorAction SilentlyContinue
Remove-Item $probe -Force -ErrorAction SilentlyContinue
if ($virtual) {
    Remove-Item $virtual.FullName -Force -ErrorAction SilentlyContinue
    if (-not $Source) { $Source = $PSScriptRoot }
    $cmdPath = Join-Path $Source 'install.cmd'
    $arg = if ($Uninstall) { ' -Uninstall' } else { '' }
    $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = "cmd.exe /c `"`"$cmdPath`"$arg`"" }
    if ($r.ReturnValue -ne 0) { throw "не удалось запустить установщик вне песочницы (код $($r.ReturnValue)). Запусти install.cmd двойным кликом." }
    Write-Host 'Установщик запущен изнутри упакованного приложения, и Windows спрятала бы его файлы в песочницу.' -ForegroundColor Yellow
    Write-Host 'Перезапустил его в отдельном окне — результат смотри там.' -ForegroundColor Yellow
    return
}

# ---------- удаление ----------

if ($Uninstall) {
    Step "Удаляю «$AppName»"
    $App = (Get-ItemProperty $UninstallKey -ErrorAction SilentlyContinue).InstallLocation
    Stop-App
    Remove-Item (@($MenuLnk, $AutoLnk) + $LegacyLnks) -Force -ErrorAction SilentlyContinue
    Remove-StrayShortcut
    Remove-Item $UninstallKey -Recurse -Force -ErrorAction SilentlyContinue
    Edit-UserPath -Remove $Data
    Remove-Item $Data -Recurse -Force -ErrorAction SilentlyContinue
    # служебное Electron (кэш и т. п.) удаляем, записи о доходах — нет: это результат работы пользователя
    if (Test-Path $UserData) {
        Get-ChildItem $UserData -Force | Where-Object { $_.Name -ne 'data.json' } |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
    Ok "ярлыки, автозапуск, команда $Command, рантайм и кэш удалены"
    if (Test-Path (Join-Path $UserData 'data.json')) {
        Note "Цель, игра и доходы оставлены: $UserData\data.json"
        Note 'При новой установке программа подхватит их сама. Не нужны — удали эту папку.'
    }
    if ($App) { Note "Папку программы не трогал: $App" }
    return
}

# ---------- программа ----------

Step 'Программа'
if (-not $Source) { $Source = $PSScriptRoot }
if (-not ($Source -and (Test-Path (Join-Path $Source 'main.js')) -and (Test-Path (Join-Path $Source 'package.json')))) {
    throw "не нашёл программу (main.js, package.json) рядом с установщиком: $Source"
}
$App = (Resolve-Path $Source).Path.TrimEnd('\')
$Package = [IO.File]::ReadAllText((Join-Path $App 'package.json')) | ConvertFrom-Json
$Version = $Package.version
$ElectronVersion = "$($Package.devDependencies.electron)".TrimStart('^', '~')
if (-not $ElectronVersion) { throw 'в package.json не указана версия electron' }
Ok "$App (версия $Version)"

# прежние способы запуска из папки программы больше не нужны
Remove-Item (Join-Path $App 'start.bat'), (Join-Path $App "$AppName.lnk") -Force -ErrorAction SilentlyContinue

# ---------- рантайм Electron ----------

Step "Electron $ElectronVersion"
$versionFile = Join-Path $Runtime 'version'
$have = if ((Test-Path $Exe) -and (Test-Path $versionFile)) { [IO.File]::ReadAllText($versionFile).Trim().TrimStart('v') }
if ($have -eq $ElectronVersion) {
    Ok "уже есть: $Runtime"
} else {
    Stop-App  # до замены файлов
    Remove-Item $Runtime -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force $Data | Out-Null
    $local = Join-Path $App 'node_modules\electron\dist'
    $localVersion = if (Test-Path (Join-Path $local 'version')) { [IO.File]::ReadAllText((Join-Path $local 'version')).Trim().TrimStart('v') }
    if ($localVersion -eq $ElectronVersion -and (Test-Path (Join-Path $local 'electron.exe'))) {
        Note 'копирую из node_modules…'
        Copy-Item $local $Runtime -Recurse -Force
    } else {
        $url = "https://github.com/electron/electron/releases/download/v$ElectronVersion/electron-v$ElectronVersion-win32-x64.zip"
        $zip = Join-Path $env:TEMP "electron-v$ElectronVersion-win32-x64.zip"
        Note "скачиваю $url"
        Invoke-Native curl.exe @('-L', '--fail', '-#', '-o', $zip, $url)
        if ($LASTEXITCODE) { throw 'не удалось скачать Electron с GitHub. Проверь интернет и запусти установку ещё раз.' }
        Note 'распаковываю…'
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::ExtractToDirectory($zip, $Runtime)
        Remove-Item $zip -Force -ErrorAction SilentlyContinue
    }
    # своё имя процесса: его видно в диспетчере задач, и по нему установщик находит свою копию
    Rename-Item (Join-Path $Runtime 'electron.exe') "$AppId.exe"
    if (-not (Test-Path $Exe)) { throw "рантайм не собрался: нет $Exe" }
    Ok $Runtime
}
# Имя программы внутри exe. Иначе «Пуск» и поиск показывают её как «Electron» (имя берётся из exe,
# а не из ярлыка), и по названию её не найти.
if ((Get-Item $Exe).VersionInfo.FileDescription -ne $AppName) {
    Stop-App
    Set-ExeStrings $Exe @{ FileDescription = $AppName; ProductName = $AppName; CompanyName = $Publisher; OriginalFilename = "$AppId.exe" }
    if ((Get-Item $Exe).VersionInfo.FileDescription -ne $AppName) { throw "не удалось записать имя программы в $Exe" }
    # Проводник запомнил старое имя «Electron» — забыть
    $mui = 'HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache'
    foreach ($p in 'FriendlyAppName', 'ApplicationCompany') {
        Remove-ItemProperty $mui "$Exe.$p" -ErrorAction SilentlyContinue
    }
    Ok "имя «$AppName» записано в $AppId.exe"
}

# ---------- команда, ярлыки, автозапуск, удаление ----------

Step 'Доступ к программе'
$firstInstall = -not (Test-Path $UninstallKey)
$iconPath = Join-Path $App 'assets\icon.ico'

Write-Cmd (Join-Path $Data "$Command.cmd") @"
@echo off
rem Generated by install.ps1 ($AppId). Usage: gg, gg settings, gg add 1500 note
rem Electron attaches to the parent console: closing the terminal would close the widget too
set ELECTRON_NO_ATTACH_CONSOLE=1
start "" "$(Use-EnvVars $Exe)" "$App" %*
if not "%~1"=="" echo OK: %*
"@
Edit-UserPath -Add $Data
Ok "команда $Command (в новых окнах терминала)"

New-Shortcut $MenuLnk $Exe "`"$App`"" $App $iconPath 'Виджет прогресса заработка на игру'
# автозапуск: при первой установке включаем, при обновлении оставляем как выбрал пользователь
$autostart = $firstInstall -or (Test-Path $AutoLnk) -or (Test-Path $LegacyLnks[1])
# ярлыки и команда под прежним именем больше не нужны
Remove-Item ($LegacyLnks + (Join-Path $Data "$LegacyCommand.cmd")) -Force -ErrorAction SilentlyContinue
Remove-StrayShortcut
if ($autostart) {
    New-Shortcut $AutoLnk $Exe "`"$App`" --background" $App $iconPath 'Виджет прогресса заработка на игру'
}
Ok ('ярлык в «Пуск»' + $(if ($autostart) { ' и автозапуск' } else { ', автозапуск выключен (включается в настройках)' }))

New-Item $UninstallKey -Force | Out-Null
$props = @{
    DisplayName = $AppName; Publisher = $Publisher; InstallLocation = $App; DisplayIcon = $iconPath
    DisplayVersion = $Version
    UninstallString = "cmd.exe /c `"`"$App\install.cmd`" -Uninstall`""
    NoModify = 1; NoRepair = 1
}
foreach ($k in $props.Keys) { Set-ItemProperty $UninstallKey $k $props[$k] }
Ok 'удаление — через «Установку и удаление программ»'

# ---------- запуск и проверка ----------

Step 'Запуск'
Stop-App
# Electron цепляется к консоли, из которой запущен: тогда окно установщика не закрывается по клавише,
# а крестик на нём закрывает и программу. Запускаем без консоли.
$env:ELECTRON_NO_ATTACH_CONSOLE = '1'
Start-Process $Exe -ArgumentList "`"$App`"", '--background' -WorkingDirectory $App
Start-Sleep -Seconds 3
$running = Get-CimInstance Win32_Process -Filter "Name='$AppId.exe'" | Where-Object { $_.ExecutablePath -like "$Runtime\*" }
if (-not $running) { throw "программа не запустилась — смотри журнал $UserData\game-goal.log" }
Ok 'виджет запущен'

Write-Host "`n$Done" -ForegroundColor Green
