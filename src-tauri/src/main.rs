#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};
use tokio::time::sleep;
use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};
use std::net::IpAddr;
use tauri::Emitter;

#[cfg(windows)]
use windows_sys::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_CAPTION_COLOR, DWMWA_TEXT_COLOR};
#[cfg(windows)]
use windows_sys::Win32::Foundation::HWND;

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
    background_color: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "PascalCase")]
struct PingResult {
    host: String,
    latency: Option<u64>,
    status: bool,
    timestamp: String,
}

struct AppState {
    settings: Arc<Mutex<AppSettings>>,
    results: Arc<Mutex<HashMap<String, Vec<PingResult>>>>,
    engine_error: Arc<Mutex<Option<String>>>,
}

// Windows 전용 타이틀바 색상 변경 함수
#[cfg(windows)]
fn set_title_bar_color<R: Runtime>(window: &tauri::WebviewWindow<R>, hex_color: &str) {
    let hwnd = window.hwnd().unwrap().0 as HWND;
    
    // HEX (#RRGGBB) to COLORREF (0x00BBGGRR)
    if hex_color.starts_with('#') && hex_color.len() == 7 {
        let r = u32::from_str_radix(&hex_color[1..3], 16).unwrap_or(0);
        let g = u32::from_str_radix(&hex_color[3..5], 16).unwrap_or(0);
        let b = u32::from_str_radix(&hex_color[5..7], 16).unwrap_or(0);
        
        let color_ref: u32 = r | (g << 8) | (b << 16);
        
        unsafe {
            // 타이틀바 배경색 변경 (DWMWA_CAPTION_COLOR = 35)
            DwmSetWindowAttribute(
                hwnd,
                35, // DWMWA_CAPTION_COLOR
                &color_ref as *const _ as *const _,
                std::mem::size_of::<u32>() as u32,
            );
            
            // 타이틀바 텍스트 색상 (배경이 밝으면 검정, 어두우면 흰색 - 단순화하여 흰색 고정 혹은 자동 계산 가능)
            let brightness = (r * 299 + g * 587 + b * 114) / 1000;
            let text_color: u32 = if brightness > 128 { 0x00000000 } else { 0x00FFFFFF };
            
            DwmSetWindowAttribute(
                hwnd,
                36, // DWMWA_TEXT_COLOR
                &text_color as *const _ as *const _,
                std::mem::size_of::<u32>() as u32,
            );
        }
    }
}

#[cfg(not(windows))]
fn set_title_bar_color<R: Runtime>(_window: &tauri::WebviewWindow<R>, _hex_color: &str) {}

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
        interval: 2,
        success_color: "#4ade80".to_string(),
        failure_color: "#f87171".to_string(),
        background_color: "#050505".to_string(),
    }
}

fn save_settings_to_file<R: Runtime>(app: &AppHandle<R>, settings: &AppSettings) {
    let path = get_config_path(app);
    if let Ok(content) = serde_json::to_string_pretty(settings) {
        std::fs::write(path, content).ok();
    }
}

async fn ping_loop<R: Runtime>(app: AppHandle<R>, state: Arc<AppState>) {
    let client_result = Client::new(&Config::default());
    let client = match client_result {
        Ok(c) => c,
        Err(_) => {
            let err_msg = "핑 클라이언트를 생성하지 못했습니다. 관리자 권한(Raw Socket)을 확인하세요.";
            {
                let mut err = state.engine_error.lock().unwrap();
                *err = Some(err_msg.to_string());
            }
            eprintln!("{}", err_msg);
            return;
        }
    };
    
    let payload = [0u8; 56];
    
    loop {
        let targets = {
            let s = state.settings.lock().unwrap();
            s.targets.clone()
        };

        let mut current_results = HashMap::new();

        for target in targets {
            let host = target.host.clone();
            
            let result = match host.parse::<IpAddr>() {
                Ok(addr) => {
                    let mut pinger = client.pinger(addr, PingIdentifier(rand::random())).await;
                    pinger.timeout(Duration::from_millis(800));
                    
                    match pinger.ping(PingSequence(0), &payload).await {
                        Ok((IcmpPacket::V4(_packet), duration)) => {
                            PingResult {
                                host: host.clone(),
                                latency: Some(duration.as_millis() as u64),
                                status: true,
                                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            }
                        }
                        _ => PingResult {
                            host: host.clone(),
                            latency: None,
                            status: false,
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                        },
                    }
                }
                Err(_) => PingResult {
                    host: host.clone(),
                    latency: None,
                    status: false,
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                },
            };

            {
                let mut res_store = state.results.lock().unwrap();
                let history = res_store.entry(host.clone()).or_insert_with(Vec::new);
                history.push(result.clone());
                if history.len() > 50 {
                    history.remove(0);
                }
                current_results.insert(host.clone(), history.clone());
            }
        }

        // Emit update to frontend
        let _ = app.emit("ping-update", &current_results);

        let interval = {
            let s = state.settings.lock().unwrap();
            s.interval
        };
        
        sleep(Duration::from_secs(interval as u64)).await;
    }
}

#[tauri::command]
fn get_ping_results(state: tauri::State<'_, Arc<AppState>>) -> HashMap<String, Vec<PingResult>> {
    let results = state.results.lock().unwrap();
    results.clone()
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
    *s = new_settings.clone();
    
    // 설정 업데이트 시 타이틀바 색상 동기화
    if let Some(window) = app.get_webview_window("main") {
        set_title_bar_color(&window, &new_settings.background_color);
    }
}

#[tauri::command]
fn get_engine_error(state: tauri::State<'_, Arc<AppState>>) -> Option<String> {
    state.engine_error.lock().unwrap().clone()
}

#[tauri::command]
fn get_latest_release() -> serde_json::Value {
    serde_json::json!({
        "tag_name": "v0.5.1",
        "name": "v0.5.1 Stable"
    })
}

#[tauri::command]
async fn import_settings(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<AppSettings, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app.dialog().file().add_filter("JSON", &["json"]).pick_file(move |file_path| {
        let _ = tx.send(file_path);
    });
    
    let file_path = rx.await.map_err(|_| "대화상자 응답을 받지 못했습니다.")?.ok_or("취소됨")?;
    let path = file_path.into_path().map_err(|_| "유효하지 않은 경로입니다.")?;
    let content = std::fs::read_to_string(path).map_err(|e| format!("파일을 읽지 못했습니다: {}", e))?;
    let settings: AppSettings = serde_json::from_str(&content).map_err(|e| format!("잘못된 형식의 설정 파일입니다: {}", e))?;
    
    save_settings_to_file(&app, &settings);
    let mut s = state.settings.lock().unwrap();
    *s = settings.clone();
    
    if let Some(window) = app.get_webview_window("main") {
        set_title_bar_color(&window, &settings.background_color);
    }
    
    Ok(settings)
}

#[tauri::command]
async fn export_settings(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = tokio::sync::oneshot::channel();
    let settings = state.settings.lock().unwrap().clone();
    
    app.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("settings.json")
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });
    
    let file_path = rx.await.map_err(|_| "대화상자 응답을 받지 못했습니다.")?.ok_or("취소됨")?;
    let path = file_path.into_path().map_err(|_| "유효하지 않은 경로입니다.")?;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| format!("데이터 변환 실패: {}", e))?;
    std::fs::write(path, content).map_err(|e| format!("파일 저장 실패: {}", e))?;
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let initial_settings = load_settings_from_file(&app.handle());
            
            // 초기 실행 시 타이틀바 색상 설정
            if let Some(window) = app.get_webview_window("main") {
                set_title_bar_color(&window, &initial_settings.background_color);
            }
            
            let state = Arc::new(AppState {
                settings: Arc::new(Mutex::new(initial_settings)),
                results: Arc::new(Mutex::new(HashMap::new())),
                engine_error: Arc::new(Mutex::new(None)),
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
            update_settings,
            get_engine_error,
            get_latest_release,
            import_settings,
            export_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
