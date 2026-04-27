use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};

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
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            always_on_top: false,
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
        Ok(store) => Ok(store),
        Err(_) => {
            let legacy_todos: Vec<Todo> = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
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
            todo.elapsed_ms = todo.elapsed_ms.saturating_add(now.saturating_sub(started_at));
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
            todo.elapsed_ms = todo.elapsed_ms.saturating_add(now.saturating_sub(started_at));
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
fn set_todo_color(state: State<'_, AppState>, id: String, color: String) -> Result<Vec<Todo>, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mut store_path = app.path().app_data_dir()?;
            store_path.push("todos.json");
            let store = load_store(&store_path)?;
            let always_on_top = store.settings.always_on_top;
            app.manage(AppState {
                store: Mutex::new(store),
                store_path,
            });
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(always_on_top);
            }
            Ok(())
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
            set_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
