document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const remainingCount = document.getElementById('remaining-count');
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date');
    const calendarElement = document.getElementById('calendar');

    // State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let tasksByDate = {};

    // Initialize
    updateClock();
    setInterval(updateClock, 1000);
    setMinDate();
    renderCalendar();
    renderTasks();

    // Event Listeners
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTask();
    });
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Calendar day click handler
    calendarElement.addEventListener('click', function(e) {
        if (e.target.tagName === 'TD' && e.target.textContent && !e.target.classList.contains('current-day')) {
            const day = parseInt(e.target.textContent);
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            taskInput.focus();
            dueDateInput.value = dateString;
        }
    });

    // Functions
    function setMinDate() {
        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        dueDateInput.min = minDate;
    }

    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false });
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        clockElement.textContent = timeString;
        dateElement.textContent = dateString;
    }

    function renderCalendar() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // Group tasks by date
        tasksByDate = {};
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = task.dueDate;
                if (!tasksByDate[dateKey]) {
                    tasksByDate[dateKey] = 0;
                }
                tasksByDate[dateKey]++;
            }
        });
        
        let calendarHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Sun</th>
                        <th>Mon</th>
                        <th>Tue</th>
                        <th>Wed</th>
                        <th>Thu</th>
                        <th>Fri</th>
                        <th>Sat</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
        `;
        
        // Empty cells for days before the 1st
        for (let i = 0; i < startingDay; i++) {
            calendarHTML += '<td></td>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasTasks = tasksByDate[dateKey] > 0;
            const isToday = day === today;
            
            let dayClass = '';
            if (isToday) dayClass = 'current-day';
            if (hasTasks) dayClass += ' has-tasks';
            
            calendarHTML += `<td class="${dayClass.trim()}" data-date="${dateKey}">${day}</td>`;
            
            if ((day + startingDay) % 7 === 0 && day !== daysInMonth) {
                calendarHTML += '</tr><tr>';
            }
        }
        
        // Empty cells after last day
        const remainingCells = 7 - ((startingDay + daysInMonth) % 7);
        if (remainingCells < 7) {
            for (let i = 0; i < remainingCells; i++) {
                calendarHTML += '<td></td>';
            }
        }
        
        calendarHTML += '</tr></tbody></table>';
        calendarElement.innerHTML = calendarHTML;
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            const newTask = {
                id: Date.now(),
                text,
                completed: false,
                dueDate: dueDateInput.value || null
            };
            tasks.unshift(newTask);
            saveTasks();
            renderTasks();
            taskInput.value = '';
            dueDateInput.value = '';
            taskInput.focus();
        }
    }

    function renderTasks() {
        // Filter tasks
        let filteredTasks;
        switch (currentFilter) {
            case 'active':
                filteredTasks = tasks.filter(task => !task.completed);
                break;
            case 'completed':
                filteredTasks = tasks.filter(task => task.completed);
                break;
            default:
                filteredTasks = [...tasks];
        }
        
        // Sort tasks: overdue first, then by due date, then no due date
        filteredTasks.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            
            const today = new Date().toISOString().split('T')[0];
            const aIsOverdue = a.dueDate < today && !a.completed;
            const bIsOverdue = b.dueDate < today && !b.completed;
            
            if (aIsOverdue && !bIsOverdue) return -1;
            if (!aIsOverdue && bIsOverdue) return 1;
            if (aIsOverdue && bIsOverdue) return a.dueDate.localeCompare(b.dueDate);
            
            return a.dueDate.localeCompare(b.dueDate);
        });
        
        // Render tasks
        taskList.innerHTML = '';
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.dataset.id = task.id;
            
            const dueDateElement = task.dueDate ? 
                `<span class="task-due-date ${getDueDateClass(task.dueDate, task.completed)}">
                    ${formatDueDate(task.dueDate)}
                </span>` : '';
            
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                ${dueDateElement}
                <button class="delete-btn">×</button>
            `;
            
            taskList.appendChild(taskItem);
            
            // Add event listeners to new elements
            const checkbox = taskItem.querySelector('.task-checkbox');
            const deleteBtn = taskItem.querySelector('.delete-btn');
            const taskText = taskItem.querySelector('.task-text');
            
            checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
            taskText.addEventListener('dblclick', () => editTask(task.id, taskText));
        });
        
        // Update remaining count
        updateTaskStats();
    }

    function formatDueDate(dateString) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];
        
        if (dateString === today) return 'Today';
        if (dateString === tomorrowString) return 'Tomorrow';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getDueDateClass(dateString, completed) {
        if (completed) return '';
        
        const today = new Date().toISOString().split('T')[0];
        if (dateString === today) return 'today';
        if (dateString < today) return 'overdue';
        return '';
    }

    function toggleTaskComplete(id) {
        tasks = tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        saveTasks();
        renderTasks();
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }

    function editTask(id, element) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        
        const container = document.createElement('div');
        container.className = 'edit-container';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.text;
        input.className = 'edit-input';
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = task.dueDate || '';
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.className = 'edit-date-input';
        
        container.appendChild(input);
        container.appendChild(dateInput);
        
        element.parentNode.replaceChild(container, element);
        input.focus();
        
        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText) {
                tasks = tasks.map(t => 
                    t.id === id ? { 
                        ...t, 
                        text: newText,
                        dueDate: dateInput.value || null
                    } : t
                );
                saveTasks();
            }
            renderTasks();
        };
        
        input.addEventListener('blur', saveEdit);
        dateInput.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEdit();
        });
        dateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEdit();
        });
    }

    function clearCompletedTasks() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }

    function updateTaskStats() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        const overdueTasks = tasks.filter(task => {
            if (task.completed || !task.dueDate) return false;
            const today = new Date().toISOString().split('T')[0];
            return task.dueDate < today;
        }).length;
        
        let statsText = `${activeTasks} ${activeTasks === 1 ? 'item' : 'items'} left`;
        if (overdueTasks > 0) {
            statsText += ` (${overdueTasks} overdue)`;
        }
        
        remainingCount.textContent = statsText;
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderCalendar();
    }
});