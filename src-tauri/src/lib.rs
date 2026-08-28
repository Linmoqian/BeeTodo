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
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const MAIN_WINDOW_LABEL: &str = "main";
const SETTINGS_VERSION: u8 = 1;
const QUICK_NOTE_WINDOW_LABEL: &str = "quick-note";
const PIN_CONTROL_WINDOW_LABEL: &str = "pin-control";
const TRAY_SHOW_MAIN_ID: &str = "show-main";
const TRAY_RESTORE_MAIN_ID: &str = "restore-main";
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct FocusSession {
    started_at: u64,
    ended_at: u64,
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
    focus_sessions: Vec<FocusSession>,
    #[serde(default)]
    settings: AppSettings,
    #[serde(default)]
    settings_version: u8,
}

impl Default for TodoStore {
    fn default() -> Self {
        Self {
            todos: Vec::new(),
            focus_sessions: Vec::new(),
            settings: AppSettings::default(),
            settings_version: SETTINGS_VERSION,
        }
    }
}

struct AppState {
    store: Mutex<TodoStore>,
    store_path: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeInfo {
    version: String,
    os: &'static str,
    arch: &'static str,
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
                focus_sessions: Vec::new(),
                settings: AppSettings::default(),
                settings_version: SETTINGS_VERSION,
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
fn list_focus_sessions(state: State<'_, AppState>) -> Result<Vec<FocusSession>, String> {
    let store = state.store.lock().map_err(|err| err.to_string())?;
    Ok(store.focus_sessions.clone())
}

fn settle_timer(todo: &mut Todo, focus_sessions: &mut Vec<FocusSession>, ended_at: u64) {
    let Some(started_at) = todo.timer_started_at.take() else {
        return;
    };

    let elapsed_ms = ended_at.saturating_sub(started_at);
    todo.elapsed_ms = todo.elapsed_ms.saturating_add(elapsed_ms);
    if elapsed_ms > 0 {
        focus_sessions.push(FocusSession {
            started_at,
            ended_at,
        });
    }
}

fn switch_timer(
    todos: &mut [Todo],
    focus_sessions: &mut Vec<FocusSession>,
    next_todo_id: &str,
    started_at: u64,
) {
    for todo in todos.iter_mut() {
        settle_timer(todo, focus_sessions, started_at);
    }

    if let Some(todo) = todos
        .iter_mut()
        .find(|todo| todo.id == next_todo_id && !todo.completed)
    {
        todo.timer_started_at = Some(started_at);
    }
}

#[tauri::command]
fn get_app_runtime_info(app: AppHandle) -> AppRuntimeInfo {
    AppRuntimeInfo {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    }
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

fn rename_todo(todos: &mut [Todo], id: &str, text: &str) -> Result<(), String> {
    let text = text.trim();
    if text.is_empty() {
        return Err("任务名称不能为空".to_string());
    }
    let todo = todos
        .iter_mut()
        .find(|todo| todo.id == id)
        .ok_or_else(|| "任务不存在".to_string())?;
    todo.text = text.to_string();
    Ok(())
}

#[tauri::command]
fn update_todo_text(
    state: State<'_, AppState>,
    id: String,
    text: String,
) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    rename_todo(&mut store.todos, &id, &text)?;
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn remove_todo(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    let now = now_ms();
    if let Some(index) = store.todos.iter().position(|todo| todo.id == id) {
        let mut todo = store.todos.remove(index);
        settle_timer(&mut todo, &mut store.focus_sessions, now);
    }
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn clear_completed(state: State<'_, AppState>) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    clear_completed_todos(&mut store.todos);
    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

fn clear_completed_todos(todos: &mut Vec<Todo>) {
    todos.retain(|todo| !todo.completed);
}

#[tauri::command]
fn toggle_todo(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    if let Some(index) = store.todos.iter().position(|todo| todo.id == id) {
        let mut todo = store.todos.remove(index);
        let next_completed = !todo.completed;

        if next_completed {
            settle_timer(&mut todo, &mut store.focus_sessions, now_ms());
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
    let TodoStore {
        todos,
        focus_sessions,
        ..
    } = &mut *store;
    switch_timer(todos, focus_sessions, &id, now);

    persist_store(&state.store_path, &store)?;
    Ok(store.todos.clone())
}

#[tauri::command]
fn pause_timer(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    let now = now_ms();
    if let Some(index) = store.todos.iter().position(|todo| todo.id == id) {
        let mut todo = store.todos.remove(index);
        settle_timer(&mut todo, &mut store.focus_sessions, now);
        store.todos.insert(index, todo);
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
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<AppSettings, String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "主窗口不存在".to_string())?;
    window
        .set_always_on_top(enabled)
        .map_err(|err| err.to_string())?;

    let mut store = state.store.lock().map_err(|err| err.to_string())?;
    store.settings.always_on_top = enabled;
    persist_store(&state.store_path, &store)?;
    Ok(store.settings.clone())
}

fn pin_control_coordinates(
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
    scale_factor: f64,
) -> (f64, f64) {
    let pin_size = 44.0 * scale_factor;
    let pin_bottom_offset = 72.0 * scale_factor;
    let x = (f64::from(position.x) + (f64::from(size.width) - pin_size) / 2.0) / scale_factor;
    let y = (f64::from(position.y) + f64::from(size.height) - pin_size - pin_bottom_offset)
        / scale_factor;
    (x, y)
}

fn set_pin_control_position(
    pin_window: &tauri::WebviewWindow,
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
    scale_factor: f64,
) -> Result<(), String> {
    let (x, y) = pin_control_coordinates(position, size, scale_factor);
    pin_window
        .set_position(tauri::LogicalPosition::new(x, y))
        .map_err(|err| err.to_string())
}

fn position_pin_control_window(
    main_window: &tauri::WebviewWindow,
    pin_window: &tauri::WebviewWindow,
) -> Result<(), String> {
    let position = main_window
        .outer_position()
        .map_err(|err| err.to_string())?;
    let size = main_window.outer_size().map_err(|err| err.to_string())?;
    let scale_factor = main_window.scale_factor().map_err(|err| err.to_string())?;
    set_pin_control_position(pin_window, position, size, scale_factor)
}

fn raise_pin_control_window(pin_window: &tauri::WebviewWindow) -> Result<(), String> {
    pin_window
        .set_ignore_cursor_events(false)
        .map_err(|err| err.to_string())?;
    pin_window
        .set_focusable(true)
        .map_err(|err| err.to_string())?;
    pin_window
        .set_always_on_top(true)
        .map_err(|err| err.to_string())?;
    pin_window.show().map_err(|err| err.to_string())?;
    pin_window.set_focus().map_err(|err| err.to_string())
}

fn open_pin_control_window(app: &AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "主窗口不存在".to_string())?;
    let position = main_window
        .outer_position()
        .map_err(|err| err.to_string())?;
    let size = main_window.outer_size().map_err(|err| err.to_string())?;
    let scale_factor = main_window.scale_factor().map_err(|err| err.to_string())?;
    let (x, y) = pin_control_coordinates(position, size, scale_factor);

    if let Some(pin_window) = app.get_webview_window(PIN_CONTROL_WINDOW_LABEL) {
        position_pin_control_window(&main_window, &pin_window)?;
        raise_pin_control_window(&pin_window)?;
        eprintln!("[click-through] 已提升现有固定钉子窗口");
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        PIN_CONTROL_WINDOW_LABEL,
        WebviewUrl::App("index.html#/pin-control".into()),
    )
    .title("BeeTodo 固定控制")
    .inner_size(44.0, 44.0)
    .min_inner_size(44.0, 44.0)
    .max_inner_size(44.0, 44.0)
    .position(x, y)
    .resizable(false)
    .decorations(false)
    .devtools(false)
    .transparent(true)
    .always_on_top(true)
    .shadow(false)
    .skip_taskbar(true)
    .focusable(true)
    .focused(true)
    .build()
    .map_err(|err| err.to_string())?;
    if let Some(pin_window) = app.get_webview_window(PIN_CONTROL_WINDOW_LABEL) {
        raise_pin_control_window(&pin_window)?;
    }
    eprintln!("[click-through] 已创建并提升固定钉子窗口");
    Ok(())
}

fn close_pin_control_window(app: &AppHandle) {
    if let Some(pin_window) = app.get_webview_window(PIN_CONTROL_WINDOW_LABEL) {
        let _ = pin_window.close();
    }
}

fn set_main_click_through(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "主窗口不存在".to_string())?;
    let configured_always_on_top = {
        let state = app.state::<AppState>();
        let store = state.store.lock().map_err(|err| err.to_string())?;
        store.settings.always_on_top
    };

    window
        .set_always_on_top(enabled || configured_always_on_top)
        .map_err(|err| err.to_string())?;
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|err| err.to_string())?;
    eprintln!("[click-through] 主窗口鼠标穿透={enabled}");
    if enabled {
        if let Err(error) = open_pin_control_window(app) {
            let _ = window.set_ignore_cursor_events(false);
            eprintln!("[click-through] 创建固定钉子窗口失败：{error}");
            return Err(error);
        }
    } else {
        close_pin_control_window(app);
        eprintln!("[click-through] 已关闭固定钉子窗口");
    }
    let _ = app.emit("click-through-changed", enabled);
    Ok(())
}

#[tauri::command]
fn set_click_through(app: AppHandle, enabled: bool) -> Result<(), String> {
    set_main_click_through(&app, enabled)
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
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "主窗口不存在".to_string())?;
    window.unminimize().map_err(|err| err.to_string())?;
    window.show().map_err(|err| err.to_string())?;
    set_main_click_through(app, false)?;
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
    .devtools(false)
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

    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App(format!("index.html#/note-tile/{note_id}").into()),
    )
    .title("BeeTodo 笔记磁贴")
    .inner_size(340.0, 320.0)
    .min_inner_size(260.0, 220.0)
    .resizable(true)
    .decorations(false)
    .devtools(false)
    .transparent(true)
    .always_on_top(true)
    .shadow(false)
    .skip_taskbar(true)
    .center()
    .build()
    .map_err(|err| err.to_string())?;
    window.show().map_err(|err| err.to_string())?;
    window
        .set_always_on_top(true)
        .map_err(|err| err.to_string())?;
    #[cfg(target_os = "windows")]
    window.set_focus().map_err(|err| err.to_string())?;
    Ok(true)
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_main = MenuItem::with_id(app, TRAY_SHOW_MAIN_ID, "显示 BeeTodo", true, None::<&str>)?;
    let restore_main = MenuItem::with_id(
        app,
        TRAY_RESTORE_MAIN_ID,
        "恢复窗口交互",
        true,
        None::<&str>,
    )?;
    let quick_note = MenuItem::with_id(app, TRAY_QUICK_NOTE_ID, "快捷便签", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, TRAY_QUIT_ID, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_main, &restore_main, &quick_note, &quit])?;

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
            TRAY_RESTORE_MAIN_ID => {
                if let Err(error) = set_main_click_through(app, false) {
                    eprintln!("恢复窗口交互失败：{error}");
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
            let mut store = store;
            if store.settings_version < SETTINGS_VERSION {
                store.settings.always_on_top = false;
                store.settings_version = SETTINGS_VERSION;
                persist_store(&store_path, &store)?;
            }
            let always_on_top = store.settings.always_on_top;
            let quick_note_shortcut = store.settings.quick_note_shortcut.clone();
            app.manage(AppState {
                store: Mutex::new(store),
                store_path,
            });
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = window.set_always_on_top(always_on_top);
            }
            setup_tray(app)?;
            if let Err(error) = app.global_shortcut().register(quick_note_shortcut.as_str()) {
                eprintln!("注册全局快捷键 {quick_note_shortcut} 失败：{error}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != MAIN_WINDOW_LABEL {
                return;
            }

            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    close_pin_control_window(window.app_handle());
                    let _ = window.hide();
                }
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                    if let Some(pin_window) = window
                        .app_handle()
                        .get_webview_window(PIN_CONTROL_WINDOW_LABEL)
                    {
                        let position = window.outer_position();
                        let size = window.outer_size();
                        if let (Ok(position), Ok(size)) = (position, size) {
                            match window.scale_factor() {
                                Ok(scale_factor) => {
                                    if let Err(error) = set_pin_control_position(
                                        &pin_window,
                                        position,
                                        size,
                                        scale_factor,
                                    ) {
                                        eprintln!("同步固定钉子位置失败：{error}");
                                    }
                                }
                                Err(error) => {
                                    eprintln!("读取主窗口缩放比例失败：{error}");
                                }
                            }
                        } else {
                            eprintln!("读取主窗口位置失败，无法同步固定钉子");
                        }
                    }
                }
                _ => {}
            }
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_todos,
            list_focus_sessions,
            get_app_runtime_info,
            add_todo,
            update_todo_text,
            remove_todo,
            toggle_todo,
            clear_completed,
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
            set_click_through,
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
    use super::{
        clear_completed_todos, is_valid_note_id, note_tile_label, rename_todo, settle_timer,
        switch_timer, Todo, TodoStore,
    };

    fn todo(id: &str, text: &str) -> Todo {
        Todo {
            id: id.to_string(),
            text: text.to_string(),
            completed: false,
            created_at: 0,
            elapsed_ms: 0,
            timer_started_at: None,
            color: "default".to_string(),
        }
    }

    #[test]
    fn validates_and_builds_note_tile_labels() {
        let note_id = "3e2e6074-c135-4b33-83d6-d5506d64d508";
        assert!(is_valid_note_id(note_id));
        assert_eq!(note_tile_label(note_id), format!("note-tile-{note_id}"));
        assert!(!is_valid_note_id("../notes#bad"));
        assert!(!is_valid_note_id(""));
    }

    #[test]
    fn renamed_todo_keeps_its_text_after_add_and_reorder() {
        let mut todos = vec![todo("one", "旧名称"), todo("two", "第二项")];
        rename_todo(&mut todos, "one", " 修改后的名称 ").expect("rename should succeed");

        todos.insert(0, todo("three", "新待办"));
        let renamed_index = todos
            .iter()
            .position(|todo| todo.id == "one")
            .expect("renamed todo should exist");
        let renamed = todos.remove(renamed_index);
        todos.push(renamed);

        assert_eq!(
            todos.last().map(|todo| todo.text.as_str()),
            Some("修改后的名称")
        );
        assert_eq!(todos[0].text, "新待办");
    }

    #[test]
    fn clear_completed_keeps_pending_todos() {
        let mut completed = todo("done", "已完成");
        completed.completed = true;
        completed.elapsed_ms = 120_000;
        let mut todos = vec![todo("pending", "未完成"), completed];

        clear_completed_todos(&mut todos);

        assert_eq!(todos.len(), 1);
        assert_eq!(todos[0].id, "pending");
        assert!(!todos[0].completed);
    }

    #[test]
    fn settling_timer_records_positive_session_once() {
        let mut active = todo("active", "计时任务");
        active.elapsed_ms = 500;
        active.timer_started_at = Some(1_000);
        let mut focus_sessions = Vec::new();

        settle_timer(&mut active, &mut focus_sessions, 3_500);
        settle_timer(&mut active, &mut focus_sessions, 4_000);

        assert_eq!(active.elapsed_ms, 3_000);
        assert_eq!(active.timer_started_at, None);
        assert_eq!(focus_sessions.len(), 1);
        assert_eq!(focus_sessions[0].started_at, 1_000);
        assert_eq!(focus_sessions[0].ended_at, 3_500);

        active.timer_started_at = Some(5_000);
        settle_timer(&mut active, &mut focus_sessions, 5_000);
        assert_eq!(focus_sessions.len(), 1);
    }

    #[test]
    fn switching_timer_settles_previous_and_starts_selected_todo() {
        let mut previous = todo("previous", "之前的任务");
        previous.timer_started_at = Some(2_000);
        let mut todos = vec![previous, todo("next", "下一个任务")];
        let mut focus_sessions = Vec::new();

        switch_timer(&mut todos, &mut focus_sessions, "next", 7_000);

        assert_eq!(todos[0].elapsed_ms, 5_000);
        assert_eq!(todos[0].timer_started_at, None);
        assert_eq!(todos[1].timer_started_at, Some(7_000));
        assert_eq!(focus_sessions.len(), 1);
        assert_eq!(focus_sessions[0].started_at, 2_000);
        assert_eq!(focus_sessions[0].ended_at, 7_000);
    }

    #[test]
    fn store_without_focus_sessions_uses_empty_history() {
        let store: TodoStore = serde_json::from_str(
            r#"{
                "todos": [],
                "settings": {},
                "settingsVersion": 1
            }"#,
        )
        .expect("legacy store should deserialize");

        assert!(store.focus_sessions.is_empty());
    }
}
