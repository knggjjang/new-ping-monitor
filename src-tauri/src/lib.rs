pub mod ping_service;

use crate::ping_service::{PingResult, PingService};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{App, AppHandle, Runtime, Emitter, Manager};
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
    pub service: Arc<Mutex<Option<Arc<PingService>>>>,
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

async fn ping_loop<R: Runtime>(app: AppHandle<R>, shared: Arc<SharedState>) {
    loop {
        let service_opt = shared.service.lock().await.clone();
        let service = match service_opt {
            Some(s) => s,
            None => {
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }
        };

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

pub fn setup<R: Runtime>(app: &mut App<R>) {
    let shared = Arc::new(SharedState {
        service: Arc::new(Mutex::new(None)),
        results: Arc::new(Mutex::new(HashMap::new())),
        settings: Arc::new(Mutex::new(AppSettings::default())),
        error: Arc::new(Mutex::new(None)),
    });

    let shared_for_setup = Arc::clone(&shared);
    app.manage(AppState { inner: shared });

    let handle = app.handle().clone();
    let shared_clone = Arc::clone(&shared_for_setup);

    tauri::async_runtime::spawn(async move {
        match PingService::new() {
            Ok(s) => {
                *shared_clone.service.lock().await = Some(Arc::new(s));
            }
            Err(e) => {
                *shared_clone.error.lock().await = Some(e);
            }
        }
        ping_loop(handle, shared_clone).await;
    });
}
