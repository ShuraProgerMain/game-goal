// Программа без установщика: сама кладёт ярлык в «Пуск» и команду gg, указывая на то место, где лежит exe.
// Ярлык нужен не только для поиска: без ярлыка с тем же AppUserModelID Windows не показывает уведомления.

use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
pub struct Status {
    exe: String,
    start_menu: bool,
    gg: bool,
}

fn exe() -> Result<PathBuf, String> {
    std::env::current_exe().map_err(|e| e.to_string())
}

#[cfg(windows)]
mod win {
    use std::path::Path;
    use windows::{
        core::{Interface, HSTRING, PCSTR, PCWSTR},
        Win32::{
            Globalization::{WideCharToMultiByte, CP_OEMCP},
            Storage::EnhancedStorage::PKEY_AppUserModel_ID,
            System::Com::{
                CoCreateInstance, CoInitializeEx, IPersistFile, StructuredStorage::*,
                CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
            },
            System::Variant::VT_LPWSTR,
            UI::Shell::{PropertiesSystem::IPropertyStore, IShellLinkW, SHStrDupW, ShellLink},
        },
    };

    pub fn programs(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
        use tauri::Manager;
        Ok(app.path().data_dir().map_err(|e| e.to_string())?.join(r"Microsoft\Windows\Start Menu\Programs"))
    }
    pub fn windows_apps(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
        use tauri::Manager;
        Ok(app.path().local_data_dir().map_err(|e| e.to_string())?.join(r"Microsoft\WindowsApps"))
    }

    // Ярлык с AppUserModelID: свойство обязано быть строкой VT_LPWSTR (готовое From<&str> даёт VT_BSTR)
    pub fn write_shortcut(lnk: &Path, target: &Path, aumid: &str, description: &str) -> windows::core::Result<()> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
            link.SetPath(&HSTRING::from(target.as_os_str()))?;
            if let Some(dir) = target.parent() {
                link.SetWorkingDirectory(&HSTRING::from(dir.as_os_str()))?;
            }
            link.SetIconLocation(&HSTRING::from(target.as_os_str()), 0)?;
            link.SetDescription(&HSTRING::from(description))?;

            let store: IPropertyStore = link.cast()?;
            // строку освобождает сам PROPVARIANT (PropVariantClear при удалении)
            let mut value = PROPVARIANT::default();
            (*value.Anonymous.Anonymous).vt = VT_LPWSTR;
            (*value.Anonymous.Anonymous).Anonymous.pwszVal = SHStrDupW(&HSTRING::from(aumid))?;
            store.SetValue(&PKEY_AppUserModel_ID, &value)?;
            store.Commit()?;

            let file: IPersistFile = link.cast()?;
            file.Save(PCWSTR(HSTRING::from(lnk.as_os_str()).as_ptr()), true)
        }
    }

    // cmd.exe читает .cmd в OEM-кодировке консоли: иначе кириллица в пути к exe превратится в мусор
    pub fn oem(text: &str) -> Vec<u8> {
        let wide: Vec<u16> = text.encode_utf16().collect();
        unsafe {
            let n = WideCharToMultiByte(CP_OEMCP, 0, &wide, None, PCSTR::null(), None);
            let mut out = vec![0u8; n.max(0) as usize];
            WideCharToMultiByte(CP_OEMCP, 0, &wide, Some(&mut out), PCSTR::null(), None);
            out
        }
    }
}

fn refuse_profile(app: &tauri::AppHandle) -> Result<(), String> {
    // С тестовым профилем система не трогается
    if app.state::<crate::Data>().profile {
        return Err("тестовый профиль: ярлыки и команда не меняются".into());
    }
    Ok(())
}

#[cfg(windows)]
fn gg_text(exe: &std::path::Path) -> String {
    format!(
        "@echo off\r\nrem Game Goal: gg, gg settings, gg stats, gg add 1500 note @client\r\n\"{}\" %*\r\nif not \"%~1\"==\"\" echo OK: %*\r\n",
        exe.display()
    )
}

#[tauri::command]
pub fn integration_status(app: tauri::AppHandle) -> Result<Status, String> {
    let exe = exe()?;
    #[cfg(windows)]
    {
        let lnk = win::programs(&app)?.join("Game Goal.lnk");
        let gg = win::windows_apps(&app)?.join("gg.cmd");
        // Команда считается на месте, только если ведёт на этот exe; ярлык проверяет ядро по запомненному пути
        let gg_ok = std::fs::read(&gg).map(|b| b == win::oem(&gg_text(&exe))).unwrap_or(false);
        return Ok(Status { exe: exe.to_string_lossy().into_owned(), start_menu: lnk.exists(), gg: gg_ok });
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Ok(Status { exe: exe.to_string_lossy().into_owned(), start_menu: false, gg: false })
    }
}

#[tauri::command]
pub fn set_start_menu(app: tauri::AppHandle, on: bool) -> Result<(), String> {
    refuse_profile(&app)?;
    #[cfg(windows)]
    {
        let lnk = win::programs(&app)?.join("Game Goal.lnk");
        if on {
            let id = app.config().identifier.clone();
            win::write_shortcut(&lnk, &exe()?, &id, "Виджет прогресса заработка на игру").map_err(|e| e.to_string())?;
        } else if lnk.exists() {
            std::fs::remove_file(&lnk).map_err(|e| e.to_string())?;
        }
    }
    let _ = on;
    Ok(())
}

#[tauri::command]
pub fn set_gg(app: tauri::AppHandle, on: bool) -> Result<(), String> {
    refuse_profile(&app)?;
    #[cfg(windows)]
    {
        let gg = win::windows_apps(&app)?.join("gg.cmd");
        if on {
            std::fs::write(&gg, win::oem(&gg_text(&exe()?))).map_err(|e| e.to_string())?;
        } else if gg.exists() {
            std::fs::remove_file(&gg).map_err(|e| e.to_string())?;
        }
    }
    let _ = on;
    Ok(())
}
