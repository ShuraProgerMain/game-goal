// Обновление без установщика: программа сама скачивает новый exe из последнего выпуска на GitHub,
// сверяет его с .sha256 из того же выпуска и подменяет себя: работающий exe переименовывается в .old
// (Windows это разрешает), новый встаёт на его место и запускается, старый удаляется при следующем старте.

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri_plugin_http::reqwest;

const REPO: &str = "ShuraProgerMain/game-goal";
const UA: &str = "GameGoal-updater";

#[derive(Serialize)]
pub struct Update {
    version: String,
    notes: String,
    page: String,
    // можно ли обновиться прямо из программы (Windows) или только скачать со страницы выпуска
    auto: bool,
}

fn newer(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u64> { v.trim_start_matches('v').split(['.', '-']).take(3).map(|p| p.parse().unwrap_or(0)).collect() };
    parse(latest) > parse(current)
}

async fn latest() -> Result<serde_json::Value, String> {
    let url = format!("https://api.github.com/repos/{REPO}/releases/latest");
    let r = reqwest::Client::new().get(url).header("User-Agent", UA).header("Accept", "application/vnd.github+json")
        .send().await.map_err(|e| e.to_string())?;
    if r.status().as_u16() == 404 { return Ok(serde_json::Value::Null); }  // выпусков ещё нет
    if !r.status().is_success() { return Err(format!("GitHub: HTTP {}", r.status())); }
    serde_json::from_slice(&r.bytes().await.map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

fn asset_url(release: &serde_json::Value, name: &str) -> Option<String> {
    release["assets"].as_array()?.iter().find(|a| a["name"] == name)?["browser_download_url"].as_str().map(String::from)
}

// Обновляется только настоящая копия: не тестовый профиль и не сборка из target.
// GAME_GOAL_UPDATE_TEST=1 разрешает обновить копию с тестовым профилем — для проверки самого обновления
fn updatable(app: &tauri::AppHandle) -> bool {
    use tauri::Manager;
    let dev = std::env::current_exe().map(|p| p.components().any(|c| c.as_os_str() == "target")).unwrap_or(true);
    let test = std::env::var("GAME_GOAL_UPDATE_TEST").is_ok_and(|v| v == "1");
    cfg!(windows) && !dev && (test || !app.state::<crate::Data>().profile)
}

#[tauri::command]
pub async fn update_check(app: tauri::AppHandle) -> Result<Option<Update>, String> {
    let rel = latest().await?;
    let Some(tag) = rel["tag_name"].as_str() else { return Ok(None) };
    let current = app.package_info().version.to_string();
    if !newer(tag, &current) { return Ok(None); }
    // Выпуск могут опубликовать раньше, чем сборка приложит файлы: пока файлов для этой системы нет, его не видно
    let needed: &[&str] = if cfg!(windows) {
        &["GameGoal.exe", "GameGoal.exe.sha256"]
    } else if cfg!(target_os = "macos") {
        &["GameGoal-macos.zip"]
    } else {
        &["GameGoal-linux-x86_64.AppImage"]
    };
    if needed.iter().any(|name| asset_url(&rel, name).is_none()) { return Ok(None); }
    Ok(Some(Update {
        version: tag.trim_start_matches('v').into(),
        notes: rel["body"].as_str().unwrap_or("").into(),
        page: rel["html_url"].as_str().unwrap_or("").into(),
        auto: updatable(&app),
    }))
}

#[tauri::command]
pub async fn update_install(app: tauri::AppHandle) -> Result<(), String> {
    if !updatable(&app) { return Err("эта копия программы не обновляется сама".into()); }
    let rel = latest().await?;
    let (Some(exe_url), Some(sha_url)) = (asset_url(&rel, "GameGoal.exe"), asset_url(&rel, "GameGoal.exe.sha256")) else {
        return Err("в выпуске нет GameGoal.exe".into());
    };
    let client = reqwest::Client::new();
    let get = |url: String| { let c = client.clone(); async move {
        let r = c.get(url).header("User-Agent", UA).send().await.map_err(|e| e.to_string())?;
        if !r.status().is_success() { return Err(format!("HTTP {}", r.status())); }
        r.bytes().await.map_err(|e| e.to_string())
    } };
    let bytes = get(exe_url).await?;
    let want = String::from_utf8_lossy(&get(sha_url).await?).split_whitespace().next().unwrap_or("").to_lowercase();
    let got: String = Sha256::digest(&bytes).iter().map(|b| format!("{b:02x}")).collect();
    if want.len() != 64 || want != got { return Err("скачанный файл не совпал с контрольной суммой".into()); }

    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let new = exe.with_extension("new.exe");
    let old = old_path(&exe);
    std::fs::write(&new, &bytes).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&old);
    std::fs::rename(&exe, &old).map_err(|e| e.to_string())?;
    if let Err(e) = std::fs::rename(&new, &exe) {
        let _ = std::fs::rename(&old, &exe);  // вернуть как было
        return Err(e.to_string());
    }
    // Новая копия дождётся, пока эта закроется: иначе она передаст запуск этой как «второй экземпляр»
    std::process::Command::new(&exe).arg(format!("--wait-pid={}", std::process::id())).spawn().map_err(|e| e.to_string())?;
    app.exit(0);
    Ok(())
}

fn old_path(exe: &std::path::Path) -> PathBuf {
    exe.with_extension("old.exe")
}

/// При старте: дождаться закрытия прежней копии (после обновления) и убрать её файл
pub fn after_update() {
    if let Some(pid) = std::env::args().find_map(|a| a.strip_prefix("--wait-pid=").and_then(|p| p.parse::<u32>().ok())) {
        wait_exit(pid);
    }
    if let Ok(exe) = std::env::current_exe() {
        let _ = std::fs::remove_file(old_path(&exe));
    }
}

#[cfg(windows)]
fn wait_exit(pid: u32) {
    use windows::Win32::{Foundation::CloseHandle, System::Threading::{OpenProcess, WaitForSingleObject, PROCESS_SYNCHRONIZE}};
    unsafe {
        if let Ok(h) = OpenProcess(PROCESS_SYNCHRONIZE, false, pid) {
            WaitForSingleObject(h, 10_000);
            let _ = CloseHandle(h);
        }
    }
}
#[cfg(not(windows))]
fn wait_exit(_pid: u32) {}
