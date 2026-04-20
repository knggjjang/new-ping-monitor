// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app_lib::{AppState, AppSettings, ReleaseInfo};
use app_lib::ping_service::PingResult;
use std::collections::HashMap;

#[tauri::command]
async fn get_latest_release() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .user_agent("new-ping-monitor")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get("https://api.github.com/repos/knggjjang/new-ping-monitor/releases/latest")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let release: ReleaseInfo = res.json().await.map_err(|e| e.to_string())?;
    Ok(release)
}

#[tauri::command]
async fn get_ping_results(
    state: tauri::State<'_, AppState>,
) -> Result<HashMap<String, Vec<PingResult>>, String> {
    Ok(state.inner.results.lock().await.clone())
}

#[tauri::command]
async fn get_settings(
    state: tauri::State<'_, AppState>,
) -> Result<AppSettings, String> {
    Ok(state.inner.settings.lock().await.clone())
}

#[tauri::command]
async fn get_engine_error(
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    Ok(state.inner.error.lock().await.clone())
}

#[tauri::command]
async fn update_settings(
    state: tauri::State<'_, AppState>,
    new_settings: AppSettings,
) -> Result<(), String> {
    *state.inner.settings.lock().await = new_settings;
    Ok(())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_log::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      get_ping_results,
      get_settings,
      update_settings,
      get_latest_release,
      get_engine_error
    ])
    .setup(|app| {
      app_lib::setup(app);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
