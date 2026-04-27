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
}

#[derive(Debug, Serialize, Deserialize)]
struct TodoStore {
    todos: Vec<Todo>,
}

struct AppState {
    todos: Mutex<Vec<Todo>>,
    store_path: PathBuf,
}

fn now_ms() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn load_todos(path: &Path) -> Result<Vec<Todo>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let store: TodoStore = serde_json::from_str(&raw).map_err(|err| err.to_string())?;
    Ok(store.todos)
}

fn persist_todos(path: &Path, todos: &[Todo]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let store = TodoStore {
        todos: todos.to_vec(),
    };
    let json = serde_json::to_string_pretty(&store).map_err(|err| err.to_string())?;
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, json).map_err(|err| err.to_string())?;
    fs::rename(&tmp, path).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_todos(state: State<'_, AppState>) -> Result<Vec<Todo>, String> {
    let todos = state.todos.lock().map_err(|err| err.to_string())?;
    Ok(todos.clone())
}

#[tauri::command]
fn add_todo(state: State<'_, AppState>, text: String) -> Result<Vec<Todo>, String> {
    let mut todos = state.todos.lock().map_err(|err| err.to_string())?;
    let todo = Todo {
        id: uuid::Uuid::new_v4().to_string(),
        text,
        completed: false,
        created_at: now_ms(),
        elapsed_ms: 0,
        timer_started_at: None,
    };
    todos.insert(0, todo);
    persist_todos(&state.store_path, &todos)?;
    Ok(todos.clone())
}

#[tauri::command]
fn remove_todo(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut todos = state.todos.lock().map_err(|err| err.to_string())?;
    todos.retain(|todo| todo.id != id);
    persist_todos(&state.store_path, &todos)?;
    Ok(todos.clone())
}

#[tauri::command]
fn toggle_todo(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut todos = state.todos.lock().map_err(|err| err.to_string())?;
    for todo in todos.iter_mut() {
        if todo.id != id {
            continue;
        }

        let next_completed = !todo.completed;
        if next_completed {
            if let Some(started_at) = todo.timer_started_at {
                todo.elapsed_ms = todo.elapsed_ms.saturating_add(now_ms().saturating_sub(started_at));
                todo.timer_started_at = None;
            }
            todo.completed = true;
        } else {
            todo.completed = false;
        }
        break;
    }
    persist_todos(&state.store_path, &todos)?;
    Ok(todos.clone())
}

#[tauri::command]
fn start_timer(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut todos = state.todos.lock().map_err(|err| err.to_string())?;
    let now = now_ms();

    for todo in todos.iter_mut() {
        if let Some(started_at) = todo.timer_started_at {
            todo.elapsed_ms = todo.elapsed_ms.saturating_add(now.saturating_sub(started_at));
            todo.timer_started_at = None;
        }
    }

    for todo in todos.iter_mut() {
        if todo.id == id && !todo.completed {
            todo.timer_started_at = Some(now);
            break;
        }
    }

    persist_todos(&state.store_path, &todos)?;
    Ok(todos.clone())
}

#[tauri::command]
fn pause_timer(state: State<'_, AppState>, id: String) -> Result<Vec<Todo>, String> {
    let mut todos = state.todos.lock().map_err(|err| err.to_string())?;
    let now = now_ms();
    for todo in todos.iter_mut() {
        if todo.id != id {
            continue;
        }
        if let Some(started_at) = todo.timer_started_at {
            todo.elapsed_ms = todo.elapsed_ms.saturating_add(now.saturating_sub(started_at));
            todo.timer_started_at = None;
        }
        break;
    }
    persist_todos(&state.store_path, &todos)?;
    Ok(todos.clone())
}

#[tauri::command]
fn reorder_todos(
    state: State<'_, AppState>,
    active_id: String,
    over_id: String,
) -> Result<Vec<Todo>, String> {
    let mut todos = state.todos.lock().map_err(|err| err.to_string())?;
    let old_index = todos.iter().position(|todo| todo.id == active_id);
    let new_index = todos.iter().position(|todo| todo.id == over_id);

    if let (Some(old_index), Some(new_index)) = (old_index, new_index) {
        let moved = todos.remove(old_index);
        todos.insert(new_index, moved);
        persist_todos(&state.store_path, &todos)?;
    }

    Ok(todos.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mut store_path = app.path().app_data_dir()?;
            store_path.push("todos.json");
            let todos = load_todos(&store_path)?;
            app.manage(AppState {
                todos: Mutex::new(todos),
                store_path,
            });
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
            reorder_todos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
