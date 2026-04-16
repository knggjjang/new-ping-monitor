mod ping_service;

use crate::ping_service::{PingResult, PingService};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Target {
    pub name: String,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub targets: Vec<Target>,
    pub interval_ms: u64,
    pub colors: HashMap<String, String>, // e.g., "online": "#00FF00", "offline": "#FF0000"
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            targets: vec![
                Target { name: "Google DNS".into(), host: "8.8.8.8".into() },
                Target { name: "Cloudflare DNS".into(), host: "1.1.1.1".into() },
            ],
            interval_ms: 2000,
            colors: {
                let mut m = HashMap::new();
                m.insert("online".into(), "#00E676".into());
                m.insert("offline".into(), "#FF1744".into());
                m.insert("background".into(), "#0A0A0A".into());
                m.insert("card".into(), "rgba(25, 25, 25, 0.7)".into());
                m
            },
        }
    }
}

pub struct AppState {
    pub service: PingService,
    pub results: Arc<Mutex<HashMap<String, Vec<PingResult>>>>,
    pub settings: Arc<Mutex<AppSettings>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub body: String,
    pub published_at: String,
}

#[tauri::command]
async fn get_latest_release() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .user_agent("new-ping-monitor")
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
    Ok(state.results.lock().await.clone())
}

#[tauri::command]
async fn get_settings(
    state: tauri::State<'_, AppState>,
) -> Result<AppSettings, String> {
    Ok(state.settings.lock().await.clone())
}

#[tauri::command]
async fn update_settings(
    state: tauri::State<'_, AppState>,
    new_settings: AppSettings,
) -> Result<(), String> {
    *state.settings.lock().await = new_settings;
    // We might want to persist to disk here
    Ok(())
}

async fn ping_loop<R: Runtime>(app: AppHandle<R>, state: Arc<AppState>) {
    loop {
        let settings = {
            state.settings.lock().await.clone()
        };

        for target in &settings.targets {
            let res = state.service.ping(&target.host).await;
            
            let mut results = state.results.lock().await;
            let entry = results.entry(target.host.clone()).or_insert_with(Vec::new);
            entry.push(res);
            if entry.len() > 50 {
                entry.remove(0);
            }
        }

        // Emit update event to frontend
        let current_results = state.results.lock().await.clone();
        let _ = app.emit("ping-update", current_results);

        tokio::time::sleep(Duration::from_millis(settings.interval_ms)).await;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        service: PingService::new(),
        results: Arc::new(Mutex::new(HashMap::new())),
        settings: Arc::new(Mutex::new(AppSettings::default())),
    };

    let results_clone = Arc::clone(&app_state.results);
    let settings_clone = Arc::clone(&app_state.settings);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(app_state)
        .setup(move |app| {
            let handle = app.handle().clone();
            let service = PingService::new();
            
            let state_for_loop = Arc::new(AppState {
                service,
                results: results_clone,
                settings: settings_clone,
            });
            
            tokio::spawn(async move {
                ping_loop(handle, state_for_loop).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ping_results,
            get_settings,
            update_settings,
            get_latest_release
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
