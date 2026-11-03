// BaseSpace's desktop shell: the launcher/HUD over every app (Alt+B), and the HUD dot beside the cursor.
//
// Both windows load BaseSpace's /hud page from its dev server (BASESPACE_URL, default http://localhost:5173), so
// all of the HUD is the web app; this only does what a browser tab can't:
// - global Alt+B, from any app;
// - an always-on-top, transparent launcher window that hides when it loses focus;
// - the dot: a small click-through window kept 35 px right of the cursor across the whole desktop;
// - `capture_screen`: the monitors as JPEG for one push-to-talk turn. Returned to the page, never written to disk.
// Push-to-talk itself (Ctrl+Alt+B) stays with the voice service; the pages react to its events.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use base64::Engine;
use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// The dot window is showing (and so follows the cursor).
static DOT_ON: AtomicBool = AtomicBool::new(false);
const DOT_OFFSET: (i32, i32) = (29, 6); // its 6 px inner margin puts the dot itself 35 px right of the pointer
const MAX_SIDE: u32 = 1568; // what vision models read at full detail; bigger only costs tokens

fn base_url() -> String {
    std::env::var("BASESPACE_URL").unwrap_or_else(|_| "http://localhost:5173".into())
}

fn hud_url(window: &str) -> WebviewUrl {
    WebviewUrl::External(format!("{}/hud?window={window}", base_url()).parse().expect("BASESPACE_URL is a URL"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Shot {
    media_type: &'static str,
    data: String,
}

/// The monitor under the cursor first, then one more if there is one: each downscaled, as base64 JPEG.
#[tauri::command]
fn capture_screen(app: AppHandle) -> Result<Vec<Shot>, String> {
    let cursor = app.cursor_position().ok();
    let mut monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    if let Some(c) = cursor {
        let under = |m: &xcap::Monitor| -> bool {
            let (x, y) = (m.x().unwrap_or(0) as f64, m.y().unwrap_or(0) as f64);
            let (w, h) = (m.width().unwrap_or(0) as f64, m.height().unwrap_or(0) as f64);
            c.x >= x && c.x < x + w && c.y >= y && c.y < y + h
        };
        monitors.sort_by_key(|m| !under(m));
    }
    println!("[shell] capture_screen: {} monitor(s)", monitors.len().min(2));
    let mut shots = Vec::new();
    for m in monitors.iter().take(2) {
        let shot = m.capture_image().map_err(|e| e.to_string())?;
        let (w, h) = (shot.width(), shot.height());
        let rgba = image::RgbaImage::from_raw(w, h, shot.into_raw()).ok_or("bad screenshot buffer")?;
        let scale = (MAX_SIDE as f64 / w.max(h) as f64).min(1.0);
        let small = image::imageops::resize(
            &rgba,
            ((w as f64 * scale).round() as u32).max(1),
            ((h as f64 * scale).round() as u32).max(1),
            image::imageops::FilterType::Triangle,
        );
        let rgb = image::DynamicImage::ImageRgba8(small).to_rgb8();
        let mut jpeg = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut Cursor::new(&mut jpeg), 80)
            .encode_image(&rgb)
            .map_err(|e| e.to_string())?;
        shots.push(Shot { media_type: "image/jpeg", data: base64::engine::general_purpose::STANDARD.encode(jpeg) });
    }
    Ok(shots)
}

/// From the launcher's mode switch: "dot" turns the dot window on or off; anything else shows the launcher.
#[tauri::command]
fn show_mode(app: AppHandle, mode: String) {
    println!("[shell] show_mode {mode}");
    if mode == "dot" {
        toggle_dot(&app);
        if let Some(l) = app.get_webview_window("launcher") {
            let _ = l.hide();
        }
    } else {
        show_launcher(&app);
    }
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

/// Whether the calling window is showing: a hidden window's page stays out of push-to-talk.
#[tauri::command]
fn window_visible(window: WebviewWindow) -> bool {
    window.is_visible().unwrap_or(false)
}

/// Shows the launcher on the monitor the cursor is on (where you're working), centred, near the top.
fn show_launcher(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("launcher") {
        if let Ok(c) = app.cursor_position() {
            if let Ok(Some(m)) = app.monitor_from_point(c.x, c.y) {
                let (pos, size, scale) = (m.position(), m.size(), m.scale_factor());
                let width = (760.0 * scale) as i32;
                let x = pos.x + (size.width as i32 - width) / 2;
                let y = pos.y + (size.height as f64 * 0.12) as i32;
                let _ = w.set_position(PhysicalPosition::new(x, y));
            }
        }
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_launcher(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("launcher") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        } else {
            show_launcher(app);
        }
    }
}

fn toggle_dot(app: &AppHandle) {
    if let Some(d) = app.get_webview_window("dot") {
        let on = !DOT_ON.load(Ordering::Relaxed);
        DOT_ON.store(on, Ordering::Relaxed);
        let _ = if on { d.show() } else { d.hide() };
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut.matches(Modifiers::ALT, Code::KeyB) {
                        toggle_launcher(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![capture_screen, show_mode, hide_window, window_visible])
        .setup(|app| {
            let launcher = WebviewWindowBuilder::new(app, "launcher", hud_url("launcher"))
                .title("BaseSpace")
                .inner_size(760.0, 640.0)
                .transparent(true)
                .decorations(false)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .visible(false)
                .build()?;
            // Like a launcher: gone as soon as you click elsewhere.
            let l = launcher.clone();
            launcher.on_window_event(move |e| {
                if let WindowEvent::Focused(false) = e {
                    let _ = l.hide();
                }
            });

            let dot = WebviewWindowBuilder::new(app, "dot", hud_url("dot"))
                .title("BaseSpace dot")
                .inner_size(380.0, 320.0)
                .transparent(true)
                .decorations(false)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .focused(false)
                .visible(false)
                .build()?;
            dot.set_ignore_cursor_events(true)?; // clicks go to whatever is under it

            // Keep the dot beside the cursor while it's on (~60 Hz; moved only when the cursor did).
            let handle = app.handle().clone();
            thread::spawn(move || {
                let mut last = (i32::MIN, i32::MIN);
                loop {
                    thread::sleep(Duration::from_millis(16));
                    if !DOT_ON.load(Ordering::Relaxed) {
                        continue;
                    }
                    if let (Ok(p), Some(d)) = (handle.cursor_position(), handle.get_webview_window("dot")) {
                        let at = (p.x as i32 + DOT_OFFSET.0, p.y as i32 + DOT_OFFSET.1);
                        if at != last {
                            last = at;
                            let _ = d.set_position(PhysicalPosition::new(at.0, at.1));
                        }
                    }
                }
            });

            app.global_shortcut().register(Shortcut::new(Some(Modifiers::ALT), Code::KeyB))?;

            let menu = Menu::with_items(
                app,
                &[
                    &MenuItem::with_id(app, "launcher", "Launcher (Alt+B)", true, None::<&str>)?,
                    &MenuItem::with_id(app, "dot", "Dot on/off", true, None::<&str>)?,
                    &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                ],
            )?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().expect("an app icon"))
                .tooltip("BaseSpace HUD")
                .menu(&menu)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "launcher" => show_launcher(app),
                    "dot" => toggle_dot(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("BaseSpace HUD failed to start");
}
