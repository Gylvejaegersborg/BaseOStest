fn main() {
    // The windows load BaseSpace from its dev server, a remote origin to Tauri: its commands need permissions the
    // capability can grant to that origin (capabilities/hud.json). Without them every invoke() was refused.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["capture_screen", "show_mode", "hide_window", "window_visible"])),
    )
    .expect("tauri build script failed")
}
