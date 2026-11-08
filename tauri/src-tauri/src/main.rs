// Game Goal на Tauri. Rust здесь — тонкий слой над системой: один экземпляр, плагины (трей, горячая клавиша,
// автозапуск, уведомления, сеть) и файлы в папке данных. Вся логика программы — в core.js в окне виджета.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::{Emitter, Manager};

/// Папка данных: %APPDATA%\game-goal (как у версии на Electron, данные переезжают сами),
/// либо GAME_GOAL_PROFILE — отдельная папка для проверок, настоящие данные не трогаются
struct Data {
    dir: PathBuf,
    profile: bool,
}

impl Data {
    // Только имена внутри папки данных: без абсолютных путей и «..»
    fn path(&self, name: &str) -> Result<PathBuf, String> {
        let rel = Path::new(name);
        if name.is_empty() || !rel.components().all(|c| matches!(c, Component::Normal(_))) {
            return Err(format!("недопустимое имя файла: {name}"));
        }
        Ok(self.dir.join(rel))
    }
}

#[derive(Serialize)]
struct EnvInfo {
    profile: bool,
    dir: String,
    args: Vec<String>,
    os: &'static str,
}

#[derive(Serialize)]
struct FileInfo {
    name: String,
    mtime: f64,
}

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[tauri::command]
fn env_info(data: tauri::State<Data>) -> EnvInfo {
    EnvInfo {
        profile: data.profile,
        dir: data.dir.to_string_lossy().into_owned(),
        args: std::env::args().skip(1).collect(),
        os: std::env::consts::OS,
    }
}

#[tauri::command]
fn file_read(data: tauri::State<Data>, name: String) -> Result<Option<String>, String> {
    let p = data.path(&name)?;
    match fs::read_to_string(&p) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(err(e)),
    }
}

// Запись атомарная: во временный файл, потом переименование поверх
#[tauri::command]
fn file_write(data: tauri::State<Data>, name: String, text: String) -> Result<(), String> {
    let p = data.path(&name)?;
    if let Some(dir) = p.parent() {
        fs::create_dir_all(dir).map_err(err)?;
    }
    let tmp = p.with_extension("tmp");
    fs::write(&tmp, text).map_err(err)?;
    fs::rename(&tmp, &p).map_err(err)
}

// Журнал: дописывается, больше 1 МБ — начинается заново
#[tauri::command]
fn file_append(data: tauri::State<Data>, name: String, text: String) -> Result<(), String> {
    let p = data.path(&name)?;
    fs::create_dir_all(&data.dir).map_err(err)?;
    if fs::metadata(&p).map(|m| m.len() > 1 << 20).unwrap_or(false) {
        fs::write(&p, "").map_err(err)?;
    }
    let mut f = fs::OpenOptions::new().create(true).append(true).open(&p).map_err(err)?;
    f.write_all(text.as_bytes()).map_err(err)
}

#[tauri::command]
fn file_list(data: tauri::State<Data>, dir: String) -> Result<Vec<FileInfo>, String> {
    let p = data.path(&dir)?;
    let Ok(rd) = fs::read_dir(&p) else { return Ok(vec![]) };
    Ok(rd
        .flatten()
        .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
        .map(|e| FileInfo {
            name: e.file_name().to_string_lossy().into_owned(),
            mtime: e
                .metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as f64)
                .unwrap_or(0.0),
        })
        .collect())
}

#[tauri::command]
fn file_copy(data: tauri::State<Data>, from: String, to: String) -> Result<(), String> {
    let (a, b) = (data.path(&from)?, data.path(&to)?);
    if let Some(dir) = b.parent() {
        fs::create_dir_all(dir).map_err(err)?;
    }
    fs::copy(a, b).map(|_| ()).map_err(err)
}

#[tauri::command]
fn file_remove(data: tauri::State<Data>, name: String) -> Result<(), String> {
    match fs::remove_file(data.path(&name)?) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(err(e)),
        _ => Ok(()),
    }
}

#[tauri::command]
fn file_exists(data: tauri::State<Data>, name: String) -> Result<bool, String> {
    Ok(data.path(&name)?.exists())
}

#[tauri::command]
fn open_data_dir(data: tauri::State<Data>) -> Result<(), String> {
    fs::create_dir_all(&data.dir).map_err(err)?;
    tauri_plugin_opener::open_path(&data.dir, None::<&str>).map_err(err)
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        // Повторный запуск (ярлык, команда gg) не открывает второй экземпляр, а передаёт команду первому
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let _ = app.emit_to("widget", "cli", argv.into_iter().skip(1).collect::<Vec<_>>());
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let (dir, profile) = match std::env::var("GAME_GOAL_PROFILE") {
                Ok(p) if !p.is_empty() => (PathBuf::from(p), true),
                _ => (app.path().data_dir()?.join("game-goal"), false),
            };
            app.manage(Data { dir, profile });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            env_info, file_read, file_write, file_append, file_list, file_copy, file_remove, file_exists,
            open_data_dir, quit
        ])
        .run(tauri::generate_context!())
        .expect("не удалось запустить Game Goal");
}
