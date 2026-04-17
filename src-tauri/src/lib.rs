mod ping_service;

use crate::ping_service::{PingResult, PingService};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Runtime, Emitter};
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
    pub colors: HashMap<String, String>,
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

pub struct SharedState {
    pub service: Option<Arc<PingService>>,
    pub results: Arc<Mutex<HashMap<String, Vec<PingResult>>>>,
    pub settings: Arc<Mutex<AppSettings>>,
    pub error: Arc<Mutex<Option<String>>>,
}

pub struct AppState {
    pub inner: Arc<SharedState>,
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
        .timeout(Duration::from_secs(10))
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

async fn ping_loop<R: Runtime>(app: AppHandle<R>, shared: Arc<SharedState>) {
    let service = match &shared.service {
        Some(s) => Arc::clone(s),
        None => return,
    };

    loop {
        let settings = shared.settings.lock().await.clone();

        for target in &settings.targets {
            let res = service.ping(&target.host).await;
            let mut results = shared.results.lock().await;
            let entry = results.entry(target.host.clone()).or_insert_with(Vec::new);
            entry.push(res);
            if entry.len() > 50 {
                entry.remove(0);
            }
        }

        let current_results = shared.results.lock().await.clone();
        let _ = app.emit("ping-update", current_results);

        tokio::time::sleep(Duration::from_millis(settings.interval_ms)).await;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (service, error) = match PingService::new() {
        Ok(s) => (Some(Arc::new(s)), None),
        Err(e) => (None, Some(e)),
    };

    let shared = Arc::new(SharedState {
        service,
        results: Arc::new(Mutex::new(HashMap::new())),
        settings: Arc::new(Mutex::new(AppSettings::default())),
        error: Arc::new(Mutex::new(error)),
    });

    let shared_for_setup = Arc::clone(&shared);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(AppState { inner: shared })
        .setup(move |app| {
            let handle = app.handle().clone();
            let shared_clone = Arc::clone(&shared_for_setup);

            tokio::spawn(async move {
                ping_loop(handle, shared_clone).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ping_results,
            get_settings,
            update_settings,
            get_latest_release,
            get_engine_error
        ])
        .run(tauri::generate_context!())
        .expect("Tauri 실행 중 치명적인 오류가 발생했습니다.");
}
