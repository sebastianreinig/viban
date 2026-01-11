/**
 * Viban Kanban Board - Frontend JavaScript
 */

const API_BASE = '';

// State
let currentProject = null;
let tasks = [];
let currentTheme = localStorage.getItem('viban-theme') || 'dark';

// DOM Elements
const projectPathEl = document.getElementById('project-path');
const boardStatsEl = document.getElementById('board-stats');
const modalProject = document.getElementById('modal-project');
const modalTask = document.getElementById('modal-task');
const themeToggleBtn = document.getElementById('btn-theme-toggle');

// Apply saved theme on load
if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggleBtn.textContent = '☀️';
}

// Theme toggle function
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('viban-theme', currentTheme);

    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggleBtn.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.textContent = '🌙';
    }
}

// ============ API Functions ============

async function api(endpoint, options = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
}

async function loadCurrentProject() {
    const data = await api('/api/project/current');
    return data;
}

async function selectProject(path) {
    const data = await api('/api/project/select', {
        method: 'POST',
        body: { path },
    });
    return data;
}

async function loadRecentProjects() {
    const data = await api('/api/projects');
    return data;
}

async function loadBoard() {
    const data = await api('/api/board');
    return data;
}

async function createTask(task) {
    return await api('/api/tasks', { method: 'POST', body: task });
}

async function updateTask(id, updates) {
    return await api(`/api/tasks/${id}`, { method: 'PUT', body: updates });
}

async function deleteTask(id) {
    return await api(`/api/tasks/${id}`, { method: 'DELETE' });
}

async function moveTask(id, column) {
    return await api(`/api/tasks/${id}/move`, {
        method: 'POST',
        body: { column },
    });
}

// ============ UI Functions ============

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderTask(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    card.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
    <div class="task-meta">
      <span class="task-priority ${task.priority}">${task.priority}</span>
      <span class="task-date">${formatDate(task.createdAt)}</span>
    </div>
  `;

    // Click to edit
    card.addEventListener('click', () => openEditTaskModal(task));

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderBoard(boardState) {
    tasks = boardState.tasks;

    // Clear columns
    document.querySelectorAll('.column-tasks').forEach(col => col.innerHTML = '');

    // Group tasks by column
    const columns = { backlog: [], todo: [], review: [], done: [] };
    tasks.forEach(task => {
        if (columns[task.column]) {
            columns[task.column].push(task);
        }
    });

    // Render tasks into columns
    Object.entries(columns).forEach(([column, columnTasks]) => {
        const container = document.querySelector(`.column-tasks[data-column="${column}"]`);
        const countEl = document.querySelector(`.column-count[data-count="${column}"]`);

        columnTasks.forEach(task => container.appendChild(renderTask(task)));
        countEl.textContent = columnTasks.length;
    });

    // Update stats
    renderStats(boardState);
}

function renderStats(boardState) {
    const total = boardState.tasks.length;
    const done = boardState.tasks.filter(t => t.column === 'done').length;
    const inProgress = boardState.tasks.filter(t => t.column === 'todo' || t.column === 'review').length;

    boardStatsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-value">${total}</span>
      <span class="stat-label">Total Tasks</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${inProgress}</span>
      <span class="stat-label">In Progress</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${done}</span>
      <span class="stat-label">Completed</span>
    </div>
  `;
}

function updateProjectDisplay(path) {
    currentProject = path;
    projectPathEl.textContent = path || 'No project selected';
}

// ============ Modal Functions ============

function openProjectModal() {
    modalProject.classList.add('active');
    document.getElementById('input-project-path').value = currentProject || '';

    // Load recent projects
    loadRecentProjects().then(({ recent }) => {
        const container = document.getElementById('recent-projects');
        if (recent && recent.length > 0) {
            container.innerHTML = `
        <h3>Recent Projects</h3>
        ${recent.map(p => `<div class="recent-project-item">${escapeHtml(p)}</div>`).join('')}
      `;
            container.querySelectorAll('.recent-project-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.getElementById('input-project-path').value = item.textContent;
                });
            });
        } else {
            container.innerHTML = '';
        }
    });
}

function closeProjectModal() {
    modalProject.classList.remove('active');
}

function openAddTaskModal(column) {
    document.getElementById('modal-task-title').textContent = 'Add Task';
    document.getElementById('input-task-id').value = '';
    document.getElementById('input-title').value = '';
    document.getElementById('input-description').value = '';
    document.getElementById('input-column').value = column;
    document.getElementById('input-priority').value = 'medium';
    document.getElementById('btn-delete-task').style.display = 'none';
    modalTask.classList.add('active');
}

function openEditTaskModal(task) {
    document.getElementById('modal-task-title').textContent = 'Edit Task';
    document.getElementById('input-task-id').value = task.id;
    document.getElementById('input-title').value = task.title;
    document.getElementById('input-description').value = task.description || '';
    document.getElementById('input-column').value = task.column;
    document.getElementById('input-priority').value = task.priority;
    document.getElementById('btn-delete-task').style.display = 'block';
    modalTask.classList.add('active');
}

function closeTaskModal() {
    modalTask.classList.remove('active');
}

// ============ Drag and Drop ============

let draggedTask = null;

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column-tasks').forEach(col => {
        col.classList.remove('drag-over');
    });
    draggedTask = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedTask) return;

    const taskId = draggedTask.dataset.taskId;
    const newColumn = e.currentTarget.dataset.column;

    try {
        await moveTask(taskId, newColumn);
        const board = await loadBoard();
        renderBoard(board);
        showToast('Task moved!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============ Event Handlers ============

async function handleSelectProject() {
    const path = document.getElementById('input-project-path').value.trim();
    if (!path) {
        showToast('Please enter a project path', 'error');
        return;
    }

    try {
        await selectProject(path);
        updateProjectDisplay(path);
        closeProjectModal();

        const board = await loadBoard();
        renderBoard(board);
        showToast('Project opened!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleSaveTask() {
    const id = document.getElementById('input-task-id').value;
    const title = document.getElementById('input-title').value.trim();
    const description = document.getElementById('input-description').value.trim();
    const column = document.getElementById('input-column').value;
    const priority = document.getElementById('input-priority').value;

    if (!title) {
        showToast('Please enter a task title', 'error');
        return;
    }

    try {
        if (id) {
            await updateTask(id, { title, description, priority });
            // Also move if column changed
            const task = tasks.find(t => t.id === id);
            if (task && task.column !== column) {
                await moveTask(id, column);
            }
            showToast('Task updated!', 'success');
        } else {
            await createTask({ title, description, column, priority });
            showToast('Task created!', 'success');
        }

        closeTaskModal();
        const board = await loadBoard();
        renderBoard(board);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleDeleteTask() {
    const id = document.getElementById('input-task-id').value;
    if (!id) return;

    if (!confirm('Delete this task?')) return;

    try {
        await deleteTask(id);
        showToast('Task deleted!', 'success');
        closeTaskModal();
        const board = await loadBoard();
        renderBoard(board);
    } catch (error) {
        showToast(error.message, 'error');
    }
}
// ============ Auto-Refresh Polling ============

let lastTasksHash = '';
let pollInterval = null;

function hashTasks(tasksArray) {
    return JSON.stringify(tasksArray.map(t => ({ id: t.id, column: t.column, updatedAt: t.updatedAt })));
}

async function pollForChanges() {
    if (!currentProject) return;
    if (modalProject.classList.contains('active') || modalTask.classList.contains('active')) return;

    try {
        const board = await loadBoard();
        const newHash = hashTasks(board.tasks);

        if (lastTasksHash && newHash !== lastTasksHash) {
            renderBoard(board);
            showToast('🔄 Board updated', 'info');
        }
        lastTasksHash = newHash;
    } catch (error) {
        console.error('Poll error:', error);
    }
}

function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(pollForChanges, 3000);
}

// ============ Initialization ============

async function init() {
    // Event listeners
    document.getElementById('btn-change-project').addEventListener('click', openProjectModal);
    document.getElementById('btn-cancel-project').addEventListener('click', closeProjectModal);
    document.getElementById('btn-select-project').addEventListener('click', handleSelectProject);

    document.getElementById('btn-cancel-task').addEventListener('click', closeTaskModal);
    document.getElementById('btn-save-task').addEventListener('click', handleSaveTask);
    document.getElementById('btn-delete-task').addEventListener('click', handleDeleteTask);

    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Add task buttons
    document.querySelectorAll('.btn-add-task').forEach(btn => {
        btn.addEventListener('click', () => openAddTaskModal(btn.dataset.column));
    });

    // Drag and drop on columns
    document.querySelectorAll('.column-tasks').forEach(col => {
        col.addEventListener('dragover', handleDragOver);
        col.addEventListener('dragleave', handleDragLeave);
        col.addEventListener('drop', handleDrop);
    });

    // Close modals on background click
    modalProject.addEventListener('click', (e) => {
        if (e.target === modalProject) closeProjectModal();
    });
    modalTask.addEventListener('click', (e) => {
        if (e.target === modalTask) closeTaskModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProjectModal();
            closeTaskModal();
        }
    });

    // Load initial state
    try {
        const { project } = await loadCurrentProject();
        if (project) {
            updateProjectDisplay(project);
            const board = await loadBoard();
            renderBoard(board);
            lastTasksHash = hashTasks(board.tasks);
            startPolling();
        } else {
            // No project - show project selection modal
            openProjectModal();
        }
    } catch (error) {
        console.error('Init error:', error);
        openProjectModal();
    }
}

// Start app
init();
