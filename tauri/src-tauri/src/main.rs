// Прототип Game Goal на Tauri: только виджет, чтобы сравнить вес и память с Electron.
// Настоящие данные не трогает: читает тестовый профиль (GAME_GOAL_PROFILE) или встроенные демо-данные.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf};

const DEMO: &str = include_str!("../demo-state.json");

#[tauri::command]
fn get_state() -> serde_json::Value {
    let profile = std::env::var("GAME_GOAL_PROFILE").ok().map(|p| PathBuf::from(p).join("data.json"));
    let text = profile.and_then(|p| fs::read_to_string(p).ok()).unwrap_or_else(|| DEMO.to_string());
    serde_json::from_str(text.trim_start_matches('\u{feff}')).unwrap_or(serde_json::Value::Null)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_state])
        .run(tauri::generate_context!())
        .expect("не удалось запустить Game Goal");
}
