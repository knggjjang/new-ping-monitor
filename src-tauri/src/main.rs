#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};
use tokio::time::sleep;
use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};
use std::net::IpAddr;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
struct PingTarget {
    name: String,
    host: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
struct AppSettings {
    targets: Vec<PingTarget>,
    interval: u32,
    success_color: String,
    failure_color: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "PascalCase")]
struct PingResult {
    name: String,
    host: String,
    latency: Option<u64>,
    status: String,
}

struct AppState {
    settings: Arc<Mutex<AppSettings>>,
    results: Arc<Mutex<HashMap<String, PingResult>>>,
}

fn get_config_path<R: Runtime>(app: &AppHandle<R>) -> std::path::PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&path).ok();
    path.push("settings.json");
    path
}

fn load_settings_from_file<R: Runtime>(app: &AppHandle<R>) -> AppSettings {
    let path = get_config_path(app);
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                return settings;
            }
        }
    }
    AppSettings {
        targets: vec![
            PingTarget { name: "Google".to_string(), host: "8.8.8.8".to_string() },
            PingTarget { name: "Cloudflare".to_string(), host: "1.1.1.1".to_string() },
        ],
        interval: 1,
        success_color: "#4ade80".to_string(),
        failure_color: "#f87171".to_string(),
    }
}

fn save_settings_to_file<R: Runtime>(app: &AppHandle<R>, settings: &AppSettings) {
    let path = get_config_path(app);
    if let Ok(content) = serde_json::to_string_pretty(settings) {
        std::fs::write(path, content).ok();
    }
}

async fn ping_loop<R: Runtime>(_app: AppHandle<R>, state: Arc<AppState>) {
    let client = Client::new(&Config::default()).unwrap();
    let payload = [0u8; 56];
    
    loop {
        let targets = {
            let s = state.settings.lock().unwrap();
            s.targets.clone()
        };

        for target in targets {
            let host = target.host.clone();
            let name = target.name.clone();
            
            let result = match host.parse::<IpAddr>() {
                Ok(addr) => {
                    let mut pinger = client.pinger(addr, PingIdentifier(rand::random())).await;
                    pinger.timeout(Duration::from_millis(800));
                    
                    match pinger.ping(PingSequence(0), &payload).await {
                        Ok((IcmpPacket::V4(_packet), duration)) => {
                            PingResult {
                                name: name.clone(),
                                host: host.clone(),
                                latency: Some(duration.as_millis() as u64),
                                status: "Success".to_string(),
                            }
                        }
                        _ => PingResult {
                            name: name.clone(),
                            host: host.clone(),
                            latency: None,
                            status: "Failure".to_string(),
                        },
                    }
                }
                Err(_) => PingResult {
                    name: name.clone(),
                    host: host.clone(),
                    latency: None,
                    status: "Invalid Host".to_string(),
                },
            };

            {
                let mut res = state.results.lock().unwrap();
                res.insert(host.clone(), result);
            }
        }

        let interval = {
            let s = state.settings.lock().unwrap();
            s.interval
        };
        
        sleep(Duration::from_secs(interval as u64)).await;
    }
}

#[tauri::command]
fn get_ping_results(state: tauri::State<'_, Arc<AppState>>) -> Vec<PingResult> {
    let results = state.results.lock().unwrap();
    results.values().cloned().collect()
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, Arc<AppState>>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn update_settings(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
    new_settings: AppSettings,
) {
    save_settings_to_file(&app, &new_settings);
    let mut s = state.settings.lock().unwrap();
    *s = new_settings;
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let initial_settings = load_settings_from_file(&app.handle());
            let state = Arc::new(AppState {
                settings: Arc::new(Mutex::new(initial_settings)),
                results: Arc::new(Mutex::new(HashMap::new())),
            });
            
            app.manage(state.clone());
            
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                ping_loop(handle, state).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ping_results,
            get_settings,
            update_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
