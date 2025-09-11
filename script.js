// Learning Progress Dashboard JavaScript
class LearningDashboard {
    constructor() {
        this.columns = [];
        this.cards = [];
        this.categories = [];
        this.currentTimer = null;
        this.timerInterval = null;
        this.draggedCard = null;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            this.isLoading = true;
            await this.loadData();
            this.setupEventListeners();
            await this.renderDashboard();
            await this.updateCategoryOptions();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            alert('Failed to load dashboard. Please refresh the page.');
        } finally {
            this.isLoading = false;
        }
    }

    // Data Management
    async loadData() {
        try {
            // Load columns, cards, and categories from Supabase
            const [columns, cards, categories] = await Promise.all([
                supabaseService.getColumns(),
                supabaseService.getCards(),
                supabaseService.getCategories()
            ]);
            
            this.columns = columns.map(col => ({
                id: col.id,
                name: col.title,
                order: col.position
            }));
            
            this.cards = cards.map(card => ({
                id: card.id,
                title: card.title,
                description: card.description,
                category: card.categories?.name || 'uncategorized',
                columnId: card.column_id,
                duration: card.duration || 0,
                assignedDate: card.date_created,
                timerStart: null,
                elapsedTime: 0
            }));
            
            this.categories = categories;
            
            // Create default columns if none exist
            if (this.columns.length === 0) {
                await this.createDefaultColumns();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to empty arrays
            this.columns = [];
            this.cards = [];
            this.categories = [];
        }
    }

    async createDefaultColumns() {
        if (this.columns.length === 0) {
            const defaultColumns = [
                { title: 'Backlog', position: 0 },
                { title: "Today's Activity", position: 1 },
                { title: 'In Progress', position: 2 },
                { title: 'Done', position: 3 }
            ];
            
            try {
                for (const columnData of defaultColumns) {
                    const newColumn = await supabaseService.createColumn(columnData.title, columnData.position);
                    this.columns.push({
                        id: newColumn.id,
                        name: newColumn.title,
                        order: newColumn.position
                    });
                }
            } catch (error) {
                console.error('Error creating default columns:', error);
            }
        }
    }

    // Column Management
    async addColumn(name) {
        try {
            const newColumn = await supabaseService.createColumn(name, this.columns.length);
            this.columns.push({
                id: newColumn.id,
                name: newColumn.title,
                order: newColumn.position
            });
            
            await this.renderDashboard();
            this.updateCardColumnOptions();
        } catch (error) {
            console.error('Error adding column:', error);
            alert('Failed to add column. Please try again.');
        }
    }

    async deleteColumn(columnId) {
        if (this.columns.length <= 1) {
            alert('You must have at least one column!');
            return;
        }
        
        // Show confirmation dialog
        if (!confirm('Are you sure you want to delete this column? All cards in this column will be moved to the first column.')) {
            return;
        }
        
        try {
            // Move cards from deleted column to first column
            const firstColumnId = this.columns[0].id;
            const cardsToMove = this.cards.filter(card => card.columnId === columnId);
            
            for (const card of cardsToMove) {
                await supabaseService.updateCard(card.id, { column_id: firstColumnId });
                card.columnId = firstColumnId;
            }
            
            // Delete the column from Supabase
            await supabaseService.deleteColumn(columnId);
            
            // Update local state
            this.columns = this.columns.filter(col => col.id !== columnId);
            
            await this.renderDashboard();
        } catch (error) {
            console.error('Error deleting column:', error);
            alert('Failed to delete column. Please try again.');
        }
    }

    // Card Management
    async addCard(title, description, category, columnId, durationHours = 0, durationMinutes = 0, assignedDate = null) {
        try {
            // Find category ID
            const existingCategory = this.categories.find(cat => cat.name.toLowerCase() === category.toLowerCase());
            const categoryId = existingCategory ? existingCategory.id : null;
            
            const totalDuration = (parseInt(durationHours) || 0) * 60 + (parseInt(durationMinutes) || 0);
            
            const cardData = {
                title: title,
                description: description,
                category_id: categoryId,
                column_id: columnId,
                duration: totalDuration,
                date_created: assignedDate ? new Date(assignedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                position: this.cards.filter(card => card.columnId === columnId).length
            };
            
            const newCard = await supabaseService.createCard(cardData);
            
            // Add to local state
            this.cards.push({
                id: newCard.id,
                title: newCard.title,
                description: newCard.description,
                category: newCard.categories?.name || 'uncategorized',
                columnId: newCard.column_id,
                duration: newCard.duration || 0,
                assignedDate: newCard.date_created,
                timerStart: null,
                elapsedTime: 0
            });
            
            await this.renderDashboard();
        } catch (error) {
            console.error('Error adding card:', error);
            alert('Failed to add card. Please try again.');
        }
    }

    async deleteCard(cardId) {
        try {
            if (this.currentTimer && this.currentTimer.cardId === cardId) {
                this.stopTimer();
            }
            
            await supabaseService.deleteCard(cardId);
            this.cards = this.cards.filter(card => card.id !== cardId);
            await this.renderDashboard();
        } catch (error) {
            console.error('Error deleting card:', error);
            alert('Failed to delete card. Please try again.');
        }
    }

    async moveCard(cardId, newColumnId) {
        try {
            const card = this.cards.find(c => c.id === cardId);
            if (!card) return;
            
            const oldColumnId = card.columnId;
            const newPosition = this.cards.filter(c => c.columnId === newColumnId).length;
            
            await supabaseService.moveCard(cardId, newColumnId, newPosition);
            card.columnId = newColumnId;
            
            // Handle timer logic based on column
            if (newColumnId === 'in-progress' && oldColumnId !== 'in-progress') {
                this.startTimer(cardId);
            } else if (oldColumnId === 'in-progress' && newColumnId !== 'in-progress') {
                if (this.currentTimer && this.currentTimer.cardId === cardId) {
                    this.stopTimer();
                }
            }
            
            await this.renderDashboard();
        } catch (error) {
            console.error('Error moving card:', error);
            alert('Failed to move card. Please try again.');
        }
    }

    // Timer Management
    startTimer(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;
        
        // Stop any existing timer
        if (this.currentTimer) {
            this.stopTimer();
        }
        
        card.timerState = 'running';
        this.currentTimer = {
            cardId: cardId,
            startTime: Date.now(),
            pausedTime: card.timeSpent
        };
        
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
        
        this.showTimerDisplay(card);
    }

    pauseTimer() {
        if (!this.currentTimer) return;
        
        const card = this.cards.find(c => c.id === this.currentTimer.cardId);
        if (card) {
            card.timerState = 'paused';
            card.timeSpent = this.currentTimer.pausedTime + (Date.now() - this.currentTimer.startTime);
        }
        
        clearInterval(this.timerInterval);
        this.currentTimer = null;
        this.renderDashboard();
    }

    stopTimer() {
        if (!this.currentTimer) return;
        
        const card = this.cards.find(c => c.id === this.currentTimer.cardId);
        if (card) {
            card.timerState = 'stopped';
            card.timeSpent = this.currentTimer.pausedTime + (Date.now() - this.currentTimer.startTime);
        }
        
        clearInterval(this.timerInterval);
        this.currentTimer = null;
        this.hideTimerDisplay();
        this.renderDashboard();
    }

    updateTimer() {
        if (!this.currentTimer) return;
        
        const totalTime = this.currentTimer.pausedTime + (Date.now() - this.currentTimer.startTime);
        const timeDisplay = document.getElementById('timer-time');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(totalTime);
        }
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
    }

    formatDateForForm(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    showTimerDisplay(card) {
        const timerDisplay = document.getElementById('timer-display');
        const cardTitle = document.getElementById('timer-card-title');
        
        if (timerDisplay && cardTitle) {
            cardTitle.textContent = card.title;
            timerDisplay.classList.remove('hidden');
        }
    }

    hideTimerDisplay() {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.classList.add('hidden');
        }
    }

    // Column Drag and Drop
    setupColumnDragAndDrop() {
        const columnHeaders = document.querySelectorAll('.column-header');
        const columns = document.querySelectorAll('.column');
        let draggedColumn = null;
        
        columnHeaders.forEach(header => {
            const column = header.closest('.column');
            
            header.addEventListener('dragstart', (e) => {
                // Prevent dragging if clicking on buttons
                if (e.target.closest('.column-actions')) {
                    e.preventDefault();
                    return;
                }
                draggedColumn = column;
                column.classList.add('column-dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            header.addEventListener('dragend', () => {
                if (column) {
                    column.classList.remove('column-dragging');
                }
                draggedColumn = null;
            });
        });
        
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedColumn && draggedColumn !== column) {
                    e.dataTransfer.dropEffect = 'move';
                    column.classList.add('column-drag-over');
                }
            });
            
            column.addEventListener('dragleave', () => {
                column.classList.remove('column-drag-over');
            });
            
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('column-drag-over');
                
                if (draggedColumn && draggedColumn !== column) {
                    this.reorderColumns(draggedColumn.dataset.columnId, column.dataset.columnId);
                }
            });
        });
    }
    
    async reorderColumns(draggedColumnId, targetColumnId) {
        try {
            const draggedIndex = this.columns.findIndex(col => col.id === draggedColumnId);
            const targetIndex = this.columns.findIndex(col => col.id === targetColumnId);
            
            if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
            
            // Remove the dragged column from its current position
            const [draggedColumn] = this.columns.splice(draggedIndex, 1);
            
            // Insert it at the target position
            this.columns.splice(targetIndex, 0, draggedColumn);
            
            // Update all column orders based on their new positions
            this.columns.forEach((column, index) => {
                column.order = index;
            });
            
            // Update in Supabase
            await supabaseService.reorderColumns(this.columns);
            
            await this.renderDashboard();
        } catch (error) {
            console.error('Error reordering columns:', error);
            alert('Failed to reorder columns. Please try again.');
            // Reload data to restore original order
            await this.loadData();
        }
    }

    // Drag and Drop
    setupDragAndDrop() {
        const cards = document.querySelectorAll('.card');
        const columns = document.querySelectorAll('.column');
        
        cards.forEach(card => {
            let isDragging = false;
            
            card.addEventListener('mousedown', (e) => {
                // Allow dragging to start
                isDragging = false;
            });
            
            card.addEventListener('dragstart', (e) => {
                isDragging = true;
                this.draggedCard = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', card.outerHTML);
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedCard = null;
                // Reset dragging flag after a short delay
                setTimeout(() => {
                    isDragging = false;
                }, 100);
            });
            
            card.addEventListener('click', (e) => {
                // Only trigger edit if not dragging
                if (!isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cardId = card.dataset.cardId;
                    this.editCard(cardId);
                }
            });
        });
        
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });
            
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedCard) {
                    const cardId = this.draggedCard.dataset.cardId;
                    const columnId = column.dataset.columnId;
                    this.moveCard(cardId, columnId);
                }
            });
        });
    }

    // Event Listeners
    setupEventListeners() {
        // Add Card Modal
        const addCardBtn = document.getElementById('add-card-btn');
        const cardModal = document.getElementById('card-modal');
        const cardForm = document.getElementById('card-form');
        const cancelCardBtn = document.getElementById('cancel-card');
        const deleteCardBtn = document.getElementById('delete-card');
        const submitCardBtn = document.getElementById('submit-card');
        const cardModalTitle = document.getElementById('card-modal-title');
        
        let editingCardId = null;
        
        addCardBtn.addEventListener('click', () => {
            editingCardId = null;
            cardModalTitle.textContent = 'Add New Learning Card';
            submitCardBtn.textContent = 'Add Card';
            deleteCardBtn.style.display = 'none';
            this.updateCardColumnOptions();
            cardForm.reset();
            // Set default category and date
            document.getElementById('card-category').value = 'art';
            const assignedDateField = document.getElementById('card-assigned-date');
            const dateDisplay = document.getElementById('dateDisplay');
            if (assignedDateField) {
                const today = new Date().toISOString().split('T')[0];
                assignedDateField.value = today;
                if (dateDisplay) {
                    dateDisplay.textContent = this.formatDateForForm(today);
                }
            }
            cardModal.classList.add('show');
        });
        


        // Date display handler
        const dateInput = document.getElementById('cardAssignedDate');
        const dateDisplay = document.getElementById('dateDisplay');
        
        if (dateInput && dateDisplay) {
            const updateDateDisplay = () => {
                if (dateInput.value) {
                    dateDisplay.textContent = this.formatDateForForm(dateInput.value);
                } else {
                    dateDisplay.textContent = '';
                }
            };
            
            dateInput.addEventListener('change', updateDateDisplay);
            dateInput.addEventListener('input', updateDateDisplay);
        }
        
        cancelCardBtn.addEventListener('click', () => {
            cardModal.classList.remove('show');
            cardForm.reset();
            editingCardId = null;
        });
        
        deleteCardBtn.addEventListener('click', () => {
            if (editingCardId && confirm('Are you sure you want to delete this card?')) {
                this.deleteCard(editingCardId);
                cardModal.classList.remove('show');
                cardForm.reset();
                editingCardId = null;
            }
        });
        
        cardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(cardForm);
            const title = formData.get('title');
            const description = formData.get('description');
            let category = formData.get('category');
            const columnId = formData.get('column');
            const durationHours = formData.get('durationHours') || 0;
            const durationMinutes = formData.get('durationMinutes') || 0;
            const assignedDate = formData.get('assignedDate');
            

            
            if (editingCardId) {
                // Edit existing card
                try {
                    // Find category ID
                    const existingCategory = this.categories.find(cat => cat.name.toLowerCase() === category.toLowerCase());
                    const categoryId = existingCategory ? existingCategory.id : null;
                    
                    const totalDuration = (parseInt(durationHours) || 0) * 60 + (parseInt(durationMinutes) || 0);
                    
                    const updateData = {
                        title,
                        description,
                        category_id: categoryId,
                        column_id: columnId,
                        duration: totalDuration,
                        date_created: assignedDate || null
                    };
                    
                    await supabaseService.updateCard(editingCardId, updateData);
                    
                    // Update local card data
                    const card = this.cards.find(c => c.id === editingCardId);
                    if (card) {
                        card.title = title;
                        card.description = description;
                        card.category = category;
                        card.columnId = columnId;
                        card.durationHours = parseInt(durationHours) || 0;
                        card.durationMinutes = parseInt(durationMinutes) || 0;
                        card.assignedDate = assignedDate ? new Date(assignedDate).toISOString() : card.assignedDate;
                    }
                    
                    await this.renderDashboard();
                } catch (error) {
                    console.error('Error updating card:', error);
                    alert('Failed to update card. Please try again.');
                    return;
                }
            } else {
                // Add new card
                this.addCard(
                    title,
                    description,
                    category,
                    columnId,
                    durationHours,
                    durationMinutes,
                    assignedDate
                );
            }
            
            cardModal.classList.remove('show');
            cardForm.reset();
            editingCardId = null;
        });
        
        // Store editingCardId for access in other methods
        this.editingCardId = editingCardId;
        this.setEditingCardId = (id) => { editingCardId = id; };
        this.getEditingCardId = () => editingCardId;
        
        // Add Column Modal
        const addColumnBtn = document.getElementById('add-column-btn');
        const columnModal = document.getElementById('column-modal');
        const columnForm = document.getElementById('column-form');
        const cancelColumnBtn = document.getElementById('cancel-column');
        
        addColumnBtn.addEventListener('click', () => {
            columnModal.classList.add('show');
        });
        
        cancelColumnBtn.addEventListener('click', () => {
            columnModal.classList.remove('show');
            columnForm.reset();
        });
        
        columnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(columnForm);
            this.addColumn(formData.get('name'));
            columnModal.classList.remove('show');
            columnForm.reset();
        });
        
        // Timer Controls
        const pauseTimerBtn = document.getElementById('pause-timer');
        const stopTimerBtn = document.getElementById('stop-timer');
        
        pauseTimerBtn.addEventListener('click', () => {
            if (this.currentTimer) {
                this.pauseTimer();
            }
        });
        
        stopTimerBtn.addEventListener('click', () => {
            this.stopTimer();
        });
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
            if (e.target.classList.contains('close')) {
                e.target.closest('.modal').classList.remove('show');
            }
        });
    }

    updateCardColumnOptions() {
        const select = document.getElementById('card-column');
        select.innerHTML = '';
        
        this.columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.name;
            select.appendChild(option);
        });
    }

    updateCategoryOptions() {
        const select = document.getElementById('card-category');
        if (!select) return;
        
        // Store current value
        const currentValue = select.value;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add categories from Supabase
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
        // Restore previous value if it still exists
        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    }

    // Rendering
    async renderDashboard() {
        const container = document.getElementById('columns-container');
        container.innerHTML = '';
        
        this.columns.sort((a, b) => a.order - b.order).forEach(column => {
            const columnElement = this.createColumnElement(column);
            container.appendChild(columnElement);
        });
        
        setTimeout(() => {
            this.setupDragAndDrop();
            this.setupColumnDragAndDrop();
        }, 100);
    }

    createColumnElement(column) {
        const columnCards = this.cards.filter(card => card.columnId === column.id);
        
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.dataset.columnId = column.id;
        
        columnDiv.innerHTML = `
            <div class="column-header" draggable="true">
                <div>
                    <h3 class="column-title">${column.name}</h3>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="column-count">${columnCards.length}</span>
                    <div class="column-actions">
                        <button onclick="dashboard.deleteColumn('${column.id}')" title="Delete Column">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="cards-container">
                ${columnCards.map(card => this.createCardHTML(card)).join('')}
            </div>
        `;
        
        return columnDiv;
    }

    createCardHTML(card) {
        const timeSpentFormatted = this.formatTime(card.timeSpent);
        const isTimerRunning = this.currentTimer && this.currentTimer.cardId === card.id;
        
        // Handle backward compatibility - convert priority to category if needed
        let category = card.category;
        if (!category && card.priority) {
            // Convert old priority system to new category system
            const priorityToCategory = {
                'high': 'art',
                'medium': 'programming', 
                'low': 'music'
            };
            category = priorityToCategory[card.priority] || 'programming';
            // Update the card object
            card.category = category;
            delete card.priority;
        }
        category = category || 'programming';
        
        const categoryDisplay = category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Format duration
        const durationHours = card.durationHours || 0;
        const durationMinutes = card.durationMinutes || 0;
        const durationDisplay = durationHours > 0 ? 
            `${durationHours}h ${durationMinutes}m` : 
            durationMinutes > 0 ? `${durationMinutes}m` : '0m';
        
        // Format assigned date
        const assignedDate = card.assignedDate ? new Date(card.assignedDate) : new Date(card.createdAt);
        
        return `
            <div class="card category-${category}" draggable="true" data-card-id="${card.id}" style="cursor: pointer;">
                <div class="card-header">
                    <h4 class="card-title">${categoryDisplay}</h4>
                </div>
                ${card.title ? `<p class="card-description">${card.title}</p>` : ''}
                <div class="card-meta">
                    <span class="card-category category-${category}">${durationDisplay}</span>
                    <span>${this.formatDate(assignedDate)}</span>
                </div>
                ${card.timeSpent > 0 || isTimerRunning ? `
                    <div class="card-timer">
                        <i class="fas fa-clock"></i>
                        <span>${timeSpentFormatted}</span>
                        ${isTimerRunning ? '<span class="timer-badge running">Running</span>' : ''}
                        ${card.timerState === 'paused' ? '<span class="timer-badge paused">Paused</span>' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    editCard(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;
        
        // Set up edit mode
        this.setEditingCardId(cardId);
        
        // Update modal
        const cardModal = document.getElementById('card-modal');
        const cardModalTitle = document.getElementById('card-modal-title');
        const submitCardBtn = document.getElementById('submit-card');
        const deleteCardBtn = document.getElementById('delete-card');
        
        cardModalTitle.textContent = 'Edit Learning Card';
        submitCardBtn.textContent = 'Update Card';
        deleteCardBtn.style.display = 'block';
        
        // Populate form
        document.getElementById('card-title').value = card.title;
        document.getElementById('card-description').value = card.description || '';
        document.getElementById('card-category').value = card.category || 'programming';
        document.getElementById('cardDurationHours').value = card.durationHours || 0;
        document.getElementById('cardDurationMinutes').value = card.durationMinutes || 0;
        
        // Set assigned date
        const assignedDate = card.assignedDate ? new Date(card.assignedDate) : new Date(card.createdAt);
        const assignedDateInput = document.getElementById('cardAssignedDate');
        const dateDisplay = document.getElementById('dateDisplay');
        
        const dateValue = assignedDate.toISOString().split('T')[0];
        assignedDateInput.value = dateValue;
        if (dateDisplay) {
            dateDisplay.textContent = this.formatDateForForm(dateValue);
        }
        
        this.updateCardColumnOptions();
        document.getElementById('card-column').value = card.columnId;
        

        
        cardModal.classList.add('show');
    }
}

// Initialize Dashboard
const dashboard = new LearningDashboard();

// Resume timer if there was one running
window.addEventListener('load', () => {
    const runningCard = dashboard.cards.find(card => card.timerState === 'running');
    if (runningCard) {
        dashboard.startTimer(runningCard.id);
    }
});

// Data is automatically saved to Supabase, no need for beforeunload handler