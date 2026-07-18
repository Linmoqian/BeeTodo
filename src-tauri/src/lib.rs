use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const QUICK_NOTE_WINDOW_LABEL: &str = "quick-note";
const TRAY_SHOW_MAIN_ID: &str = "show-main";
const TRAY_QUICK_NOTE_ID: &str = "quick-note";
const TRAY_QUIT_ID: &str = "quit";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Todo {
    id: String,
    text: String,
    completed: bool,
    created_at: u64,
    elapsed_ms: u64,
    timer_started_at: Option<u64>,
    #[serde(default = "default_todo_color")]
    color: String,
}

fn default_todo_color() -> String {
    "default".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    #[serde(default)]
    always_on_top: bool,
    #[serde(default = "default_compact_opacity")]
    compact_opacity: u8,
    #[serde(default)]
    pet_enabled: bool,
    #[serde(default = "default_user_name")]
    user_name: String,
    #[serde(default = "default_pet_name")]
    pet_name: String,
    #[serde(default = "default_quick_note_shortcut")]
    quick_note_shortcut: String,
}

fn default_user_name() -> String {
    "Bee".to_string()
}

fn default_pet_name() -> String {
    "小蜜蜂".to_string()
}

fn default_compact_opacity() -> u8 {
    60
}

fn default_quick_note_shortcut() -> String {
    "Ctrl+Space".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            always_on_top: false,
            compact_opacity: default_compact_opacity(),
            pet_enabled: false,
            user_name: default_user_name(),
            pet_name: default_pet_name(),
            quick_note_shortcut: default_quick_note_shortcut(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TodoStore {
    #[serde(default)]
    todos: Vec<Todo>,
    #[serde(default)]
    settings: AppSettings,
}

impl Default for TodoStore {
    fn default() -> Self {
        Self {
            todos: Vec::new(),
            settings: AppSettings::default(),
        }
    }
}

struct AppState {
    store: Mutex<TodoStore>,
    store_path: PathBuf,
}

fn now_ms() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn load_store(path: &Path) -> Result<TodoStore, String> {
    if !path.exists() {
        return Ok(TodoStore::default());
    }

    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    match serde_json::from_str::<TodoStore>(&raw) {
        Ok(mut store) => {
            if matches!(store.settings.user_name.as_str(), "工程师" | "龚博后") {
                store.settings.user_name = default_user_name();
            }
            Ok(store)
        }
        Err(_) => {
            let legacy_todos: Vec<Todo> =
                serde_json::from_str(&raw).map_err(|err| err.to_string())?;
            Ok(TodoStore {
                todos: legacy_todos,
                settings: AppSettings::default(),
            })
        }
    }
}

fn persist_store(path: &Path, store: &TodoStore) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let json = serde_json::to_string_pretty(store).map_err(|err| err.to_string())?;
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, json).map_err(|err| err.to_string())?;
    fs::rename(&tmp, path).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_todos(state: State<'_, AppState>) -> Result<Vec<Todo>, String> {
    let store = state.store.lock().map_err(|err| err.to_string())?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn add_todo(state: State<'_, AppState>, text: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    let todo = Todo {
        id: uuid::Uuid::new_v4().to_string(),
        text,
        completed: false,
        created_at: now_ms(),
        elapsed_ms: 0,
        timer_started_at: None,
        color: default_todo_color(),
    };
    store.todos.insert(0, todo);
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn remove_todo(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.todos.retain(|todo| todo.id != id);
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn toggle_todo(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    if let Some(index) = store.todos.iter().position(|todo| todo.id == id) {
        let mut todo = store.todos.remove(index);
        let next_completed = !todo.completed;

        if next_completed {
            if let Some(started_at) = todo.timer_started_at {
                todo.elapsed_ms = todo
                    .elapsed_ms
                    .saturating_add(now_ms().saturating_sub(started_at));
                todo.timer_started_at = None;
            }
            todo.completed = true;
            store.todos.push(todo);
        } else {
            todo.completed = false;
            store.todos.insert(0, todo);
        }
    }

    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn start_timer(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    let now = now_ms();

    for todo in store.todos.iter_mut() {
        if let Some(started_at) = todo.timer_started_at {
            todo.elapsed_ms = todo
                .elapsed_ms
                .saturating_add(now.saturating_sub(started_at));
            todo.timer_started_at = None;
        }
    }

    for todo in store.todos.iter_mut() {
        if todo.id == id && !todo.completed {
            todo.timer_started_at = Some(now);
            break;
        }
    }

    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn pause_timer(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    let now = now_ms();
    for todo in store.todos.iter_mut() {
        if todo.id != id {
            continue;
        }
        if let Some(started_at) = todo.timer_started_at {
            todo.elapsed_ms = todo
                .elapsed_ms
                .saturating_add(now.saturating_sub(started_at));
            todo.timer_started_at = None;
        }
        break;
    }
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn reorder_todos(
    state: State<'_, AppState>,
    active_id: String,
    over_id: String,
) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    let old_index = store.todos.iter().position(|todo| todo.id == active_id);
    let new_index = store.todos.iter().position(|todo| todo.id == over_id);

    if let (Some(old_index), Some(new_index)) = (old_index, new_index) {
        let moved = store.todos.remove(old_index);
        store.todos.insert(new_index, moved);
        persist_store(&state.store_path, &store)?;
    }

    Ok(store.todos.clone())
}

#[tauri::command]
fn set_todo_color(
    state: State<'_, AppState>,
    id: String,
    color: String,
) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    for todo in store.todos.iter_mut() {
        if todo.id == id {
            todo.color = color.clone();
            break;
        }
    }
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn pin_todo_top(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    if let Some(index) = store.todos.iter().position(|todo| todo.id == id) {
        let mut todo = store.todos.remove(index);
        todo.completed = false;
        store.todos.insert(0, todo);
        persist_store(&state.store_path, &store)?;
    }

    Ok(store.todos.clone())
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let store = state.store.lock().map_err(|err| err.to_string())?;
    Ok(store.settings.clone())
}

#[tauri::command]
fn set_always_on_top(
    state: State<'_, AppState>,
    window: tauri::Window,
    enabled: bool,
) -> Result<AppSettings, String> {
    window
        .set_always_on_top(enabled)
        .map_err(|err| err.to_string())?;

    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.always_on_top = enabled;
    persist_store(&state.store_path, &store)?;
    Ok(store.settings.clone())
}

#[tauri::command]
fn set_compact_opacity(state: State<'_, AppState>, opacity: u8) -> Result<AppSettings, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.compact_opacity = opacity.min(100);
    persist_store(&state.store_path, &store)?;
    Ok(store.settings.clone())
}

#[tauri::command]
fn set_pet_enabled(state: State<'_, AppState>, enabled: bool) -> Result<AppSettings, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.pet_enabled = enabled;
    persist_store(&state.store_path, &store)?;
    Ok(store.settings.clone())
}

#[tauri::command]
fn set_user_name(state: State<'_, AppState>, name: String) -> Result<AppSettings, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.user_name = name;
    persist_store(&state.store_path, &store)?;
    Ok(store.settings.clone())
}

#[tauri::command]
fn set_pet_name(state: State<'_, AppState>, name: String) -> Result<AppSettings, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.pet_name = name;
    persist_store(&state.store_path, &store)?;
    Ok(store.settings.clone())
}

#[tauri::command]
fn set_quick_note_shortcut(
    state: State<'_, AppState>,
    app: AppHandle,
    shortcut: String,
) -> Result<AppSettings, String> {
    let shortcut = shortcut.trim().to_string();
    if shortcut.is_empty() {
        return Err("快捷键不能为空".to_string());
    }

    let previous_shortcut = {
        let store = state.store.lock().map_err(|err| err.to_string())?;
        store.settings.quick_note_shortcut.clone()
    };

    app.global_shortcut()
        .unregister_all()
        .map_err(|err| err.to_string())?;
    if let Err(error) = app.global_shortcut().register(shortcut.as_str()) {
        let _ = app.global_shortcut().register(previous_shortcut.as_str());
        return Err(format!("快捷键不可用：{error}"));
    }

    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.quick_note_shortcut = shortcut;
    if let Err(error) = persist_store(&state.store_path, &store) {
        store.settings.quick_note_shortcut = previous_shortcut.clone();
        let _ = app.global_shortcut().unregister_all();
        let _ = app.global_shortcut().register(previous_shortcut.as_str());
        return Err(error);
    }
    Ok(store.settings.clone())
}

fn show_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;
    window.unminimize().map_err(|err| err.to_string())?;
    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())
}

fn open_quick_note_window_inner(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(QUICK_NOTE_WINDOW_LABEL) {
        window.show().map_err(|err| err.to_string())?;
        window.set_focus().map_err(|err| err.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        QUICK_NOTE_WINDOW_LABEL,
        WebviewUrl::App("index.html#/quick-note".into()),
    )
    .title("BeeTodo 快捷便签")
    .inner_size(380.0, 380.0)
    .min_inner_size(320.0, 300.0)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .shadow(false)
    .skip_taskbar(true)
    .center()
    .build()
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn note_tile_label(note_id: &str) -> String {
    format!("note-tile-{note_id}")
}

fn is_valid_note_id(note_id: &str) -> bool {
    !note_id.is_empty()
        && note_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
}

#[tauri::command]
fn open_quick_note_window(app: AppHandle) -> Result<(), String> {
    open_quick_note_window_inner(&app)
}

#[tauri::command]
fn toggle_note_tile(app: AppHandle, note_id: String) -> Result<bool, String> {
    if !is_valid_note_id(&note_id) {
        return Err("笔记 ID 格式无效".to_string());
    }
    let label = note_tile_label(&note_id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|err| err.to_string())?;
        return Ok(false);
    }

    WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App(format!("index.html#/note-tile/{note_id}").into()),
    )
    .title("BeeTodo 笔记磁贴")
    .inner_size(340.0, 320.0)
    .min_inner_size(260.0, 220.0)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .shadow(false)
    .skip_taskbar(true)
    .center()
    .build()
    .map_err(|err| err.to_string())?;
    Ok(true)
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_main = MenuItem::with_id(app, TRAY_SHOW_MAIN_ID, "显示 BeeTodo", true, None::<&str>)?;
    let quick_note = MenuItem::with_id(app, TRAY_QUICK_NOTE_ID, "快捷便签", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, TRAY_QUIT_ID, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_main, &quick_note, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().ok_or("缺少应用图标")?.clone())
        .tooltip("BeeTodo")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_SHOW_MAIN_ID => {
                if let Err(error) = show_main_window(app) {
                    eprintln!("显示主窗口失败：{error}");
                }
            }
            TRAY_QUICK_NOTE_ID => {
                if let Err(error) = open_quick_note_window_inner(app) {
                    eprintln!("打开快捷便签失败：{error}");
                }
            }
            TRAY_QUIT_ID => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let app_handle = app.clone();
                    let _ = app.run_on_main_thread(move || {
                        if let Err(error) = open_quick_note_window_inner(&app_handle) {
                            eprintln!("通过快捷键打开便签失败：{error}");
                        }
                    });
                })
                .build(),
        )
        .setup(|app| {
            let mut store_path = app.path().app_data_dir()?;
            store_path.push("todos.json");
            let store = load_store(&store_path)?;
            let always_on_top = store.settings.always_on_top;
            let quick_note_shortcut = store.settings.quick_note_shortcut.clone();
            app.manage(AppState {
                store: Mutex::new(store),
                store_path,
            });
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(always_on_top);
            }
            setup_tray(app)?;
            if let Err(error) = app.global_shortcut().register(quick_note_shortcut.as_str()) {
                eprintln!("注册全局快捷键 {quick_note_shortcut} 失败：{error}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_todos,
            add_todo,
            remove_todo,
            toggle_todo,
            start_timer,
            pause_timer,
            reorder_todos,
            set_todo_color,
            pin_todo_top,
            get_settings,
            set_always_on_top,
            set_compact_opacity,
            set_pet_enabled,
            set_user_name,
            set_pet_name,
            set_quick_note_shortcut,
            open_quick_note_window,
            toggle_note_tile
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Err(error) = show_main_window(app) {
                    eprintln!("从 Dock 恢复主窗口失败：{error}");
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::{is_valid_note_id, note_tile_label};

    #[test]
    fn validates_and_builds_note_tile_labels() {
        let note_id = "3e2e6074-c135-4b33-83d6-d5506d64d508";
        assert!(is_valid_note_id(note_id));
        assert_eq!(note_tile_label(note_id), format!("note-tile-{note_id}"));
        assert!(!is_valid_note_id("../notes#bad"));
        assert!(!is_valid_note_id(""));
    }
}
