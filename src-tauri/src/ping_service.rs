use std::net::IpAddr;
use std::time::Duration;
use surge_ping::{Client, Config, PingIdentifier, PingSequence};
use tokio::time::timeout;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Local};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingResult {
    pub ip: String,
    pub latency: Option<u128>,
    pub timestamp: DateTime<Local>,
    pub status: bool,
    pub error: Option<String>,
}

pub struct PingService {
    client: Client,
}

impl PingService {
    pub fn new() -> Self {
        let config = Config::default();
        let client = Client::new(&config).expect("Failed to create ping client");
        Self { client }
    }

    pub async fn ping(&self, host: &str) -> PingResult {
        let ip: IpAddr = match host.parse() {
            Ok(ip) => ip,
            Err(_) => {
                // Try resolving hostname if it's not a direct IP
                match tokio::net::lookup_host(format!("{}:0", host)).await {
                    Ok(mut addrs) => addrs.next().map(|a| a.ip()).unwrap_or("0.0.0.0".parse().unwrap()),
                    Err(_) => return PingResult {
                        ip: host.to_string(),
                        latency: None,
                        timestamp: Local::now(),
                        status: false,
                        error: Some("DNS Resolution Failed".to_string()),
                    },
                }
            }
        };

        let mut pinger = self.client.pinger(ip, PingIdentifier(rand::random())).await;
        pinger.timeout(Duration::from_secs(2));

        use rand::Rng;
        let mut data = [0u8; 32];
        rand::thread_rng().fill(&mut data);

        let _t0 = std::time::Instant::now();
        match timeout(Duration::from_secs(2), pinger.ping(PingSequence(0), &data)).await {
            Ok(Ok((_, duration))) => {
                PingResult {
                    ip: ip.to_string(),
                    latency: Some(duration.as_millis()),
                    timestamp: Local::now(),
                    status: true,
                    error: None,
                }
            }
            Ok(Err(e)) => {
                PingResult {
                    ip: ip.to_string(),
                    latency: None,
                    timestamp: Local::now(),
                    status: false,
                    error: Some(e.to_string()),
                }
            }
            Err(_) => {
                PingResult {
                    ip: ip.to_string(),
                    latency: None,
                    timestamp: Local::now(),
                    status: false,
                    error: Some("Timeout".to_string()),
                }
            }
        }
    }
}
