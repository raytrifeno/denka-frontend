// Launches the bundled WhatsApp receipt service (whatsapp/server.mjs) so the
// user never has to touch a terminal: Pengaturan → WhatsApp → Hubungkan spawns
// it, then the app polls http://localhost:3100/status for the QR code.

use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Manager};

const PORT: u16 = 3100;

/// True when something already listens on the service port.
fn is_running() -> bool {
    let addr: SocketAddr = ([127, 0, 0, 1], PORT).into();
    TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok()
}

/// The bundled service directory: app resources in production, repo folder in dev.
/// Tauri may lay resources out under `_up_/` when the source path starts with `..`,
/// so probe both spellings before falling back to the checked-out repo.
fn service_dir(app: &AppHandle) -> Option<PathBuf> {
    let res = app.path().resource_dir().ok();
    let candidates = [
        res.as_ref().map(|d| d.join("whatsapp")),
        res.as_ref().map(|d| d.join("_up_").join("whatsapp")),
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(|d| d.join("whatsapp")),
    ];
    candidates
        .into_iter()
        .flatten()
        .find(|d| d.join("server.mjs").is_file())
}

/// Node is the only prerequisite. PATH is unreliable for GUI apps on macOS, so
/// probe the usual install locations too.
fn find_node() -> Option<PathBuf> {
    let named = if cfg!(windows) { "node.exe" } else { "node" };
    if Command::new(named)
        .arg("-v")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok_and(|s| s.success())
    {
        return Some(PathBuf::from(named));
    }
    let fallbacks: &[&str] = if cfg!(windows) {
        &["C:/Program Files/nodejs/node.exe"]
    } else {
        &[
            "/usr/local/bin/node",
            "/usr/bin/node",
            "/opt/homebrew/bin/node",
        ]
    };
    fallbacks.iter().map(PathBuf::from).find(|p| p.is_file())
}

/// Starts the service if it is not already up. Returns immediately — the caller
/// polls /status, which reports the QR as soon as Chromium has booted.
#[tauri::command]
pub fn start_whatsapp_service(app: AppHandle) -> Result<String, String> {
    if is_running() {
        return Ok("running".into());
    }

    let dir = service_dir(&app)
        .ok_or("Layanan WhatsApp tidak ditemukan di aplikasi ini. Pasang ulang aplikasi.")?;
    if !dir.join("node_modules").is_dir() {
        return Err("Komponen layanan WhatsApp belum lengkap. Pasang ulang aplikasi.".into());
    }
    let node = find_node().ok_or(
        "Node.js belum terpasang di PC ini. Pasang Node.js (nodejs.org), lalu coba lagi.",
    )?;

    // App data holds the session so it survives app updates and stays writable.
    let session = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("whatsapp-session");

    let mut cmd = Command::new(node);
    cmd.arg("server.mjs")
        .current_dir(&dir)
        .env("WHATSAPP_DATA_DIR", session)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    // Keep the console window from flashing on Windows.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }

    cmd.spawn()
        .map_err(|e| format!("Gagal menyalakan layanan WhatsApp: {e}"))?;
    Ok("starting".into())
}
