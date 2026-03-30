#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(not(target_os = "android"))]
    {
        builder = builder.plugin(tauri_plugin_opener::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running SafeKey");
}
