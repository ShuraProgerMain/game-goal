// Уведомления Windows, у которых работает нажатие: плагин уведомлений Tauri о нём не сообщает.
// Нажатие передаётся ядру в окне виджета событием notify:click с вкладкой настроек, которую надо открыть.

#[tauri::command]
pub fn notify(app: tauri::AppHandle, title: String, body: String, tab: Option<String>) -> Result<(), String> {
    #[cfg(windows)]
    {
        use tauri::Emitter;
        use tauri_winrt_notification::Toast;
        // ID приложения — как у ярлыка в «Пуске»; сборка из target ярлыка не имеет, она показывает как PowerShell
        let dev = std::env::current_exe().map(|p| p.components().any(|c| c.as_os_str() == "target")).unwrap_or(true);
        let id = if dev { Toast::POWERSHELL_APP_ID.to_string() } else { app.config().identifier.clone() };
        let handle = app.clone();
        Toast::new(&id)
            .title(&title)
            .text1(&body)
            .on_activated(move |_| {
                let _ = handle.emit_to("widget", "notify:click", tab.clone());
                Ok(())
            })
            .show()
            .map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = (app, title, body, tab);
        Err("на этой системе — через плагин уведомлений".into())
    }
}
