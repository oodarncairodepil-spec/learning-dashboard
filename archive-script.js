// Archive Dashboard JavaScript
class ArchiveDashboard {
    constructor() {
        this.columns = [];
        this.archivedCards = [];
        this.categories = [];
        this.isLoading = false;
        this.columnFilters = {}; // Store filters for each column
        this.currentFilterColumnId = null;
        
        this.init();
    }

    async init() {
        try {
            // Check authentication first
            if (!(await this.checkAuthentication())) {
                window.location.href = 'login.html';
                return;
            }
            
            this.isLoading = true;
            await this.loadData();
            await this.loadDashboardSettings();
            this.setupEventListeners();
            this.updateUserAvatar();
            await this.renderDashboard();
            await this.updateCategoryOptions();
        } catch (error) {
            console.error('Error initializing archive dashboard:', error);
            alert('Failed to load archive dashboard. Please refresh the page.');
        } finally {
            this.isLoading = false;
        }
    }

    async checkAuthentication() {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentUserEmail = localStorage.getItem('currentUser');
        
        if (isAuthenticated === 'true' && currentUserEmail) {
            // Set current user in supabase service and wait for it to complete
            await this.setCurrentUserFromEmail(currentUserEmail);
            return true;
        }
        
        return false;
    }

    async setCurrentUserFromEmail(email) {
        try {
            if (window.supabaseService) {
                await window.supabaseService.setCurrentUserFromEmail(email);
            }
        } catch (error) {
            console.error('Error setting current user:', error);
        }
    }

    logout() {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    updateUserAvatar() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const avatarElement = document.querySelector('.user-avatar');
            if (avatarElement) {
                // Extract first letter of email for avatar
                const firstLetter = currentUser.charAt(0).toUpperCase();
                avatarElement.textContent = firstLetter;
                
                // Set background color based on email hash
                const hash = currentUser.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                const hue = Math.abs(hash) % 360;
                avatarElement.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
            }
        }
    }

    // Settings modal functionality
    async openSettingsModal(columnId = null) {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Populate column selector
            await this.populateColumnSelector();
            
            if (columnId) {
                // Load settings for specific column
                this.currentFilterColumnId = columnId;
                const columnSelector = document.getElementById('settingsColumnSelect');
                if (columnSelector) {
                    columnSelector.value = columnId;
                    
                    // Load and populate settings for this column
                    const settings = await this.loadColumnSettings(columnId);
                    if (settings) {
                        this.populateSettingsForm(settings);
                    }
                }
            }
        }
    }

    async populateColumnSelector() {
        const columnSelector = document.getElementById('settingsColumnSelect');
        if (columnSelector) {
            columnSelector.innerHTML = '<option value="">Select a column...</option>';
            
            this.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = column.id;
                option.textContent = column.name;
                columnSelector.appendChild(option);
            });
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateSettingsForm(settings) {
        // Populate dashboard section display setting
        const dashboardSectionDisplay = document.getElementById('dashboardSectionDisplay');
        if (dashboardSectionDisplay && settings.dashboard_section_display) {
            dashboardSectionDisplay.value = settings.dashboard_section_display;
        }
        
        // Populate column-specific settings if any
        const columnId = document.getElementById('settingsColumnSelect')?.value;
        if (columnId && settings.column_settings && settings.column_settings[columnId]) {
            const columnSettings = settings.column_settings[columnId];
            // Add column-specific setting population here if needed
        }
    }

    async loadDashboardSettings() {
        try {
            if (window.supabaseService) {
                const settings = await window.supabaseService.getDashboardSettings();
                if (settings) {
                    this.dashboardSettings = settings;
                    
                    // Apply dashboard section display setting
                    const sectionDisplay = settings.dashboard_section_display || 'cards_only';
                    this.dashboardSectionDisplay = sectionDisplay;
                    
                    // Apply any other dashboard-wide settings
                    if (settings.column_settings) {
                        this.columnSettings = settings.column_settings;
                    }
                } else {
                    // Set default settings
                    this.dashboardSettings = { dashboard_section_display: 'cards_only' };
                    this.dashboardSectionDisplay = 'cards_only';
                }
            }
        } catch (error) {
            console.error('Error loading dashboard settings:', error);
        }
    }

    // Format section header based on dashboard settings
    formatSectionHeader(cardCount, totalTimeFormatted) {
        if (this.dashboardSectionDisplay === 'cards_and_duration') {
            return `${cardCount} cards • ${totalTimeFormatted}`;
        } else {
            // Default to cards only
            return `${cardCount} cards`;
        }
    }

    async saveSettings() {
        try {
            const columnId = document.getElementById('settingsColumnSelect')?.value;
            const dashboardSectionDisplay = document.getElementById('dashboardSectionDisplay')?.value;
            
            // Prepare settings object
            const settings = {
                dashboard_section_display: dashboardSectionDisplay || 'cards_only',
                column_settings: this.columnSettings || {}
            };
            
            // Add column-specific settings if a column is selected
            if (columnId) {
                if (!settings.column_settings[columnId]) {
                    settings.column_settings[columnId] = {};
                }
                // Add any column-specific settings here
            }
            
            // Save to database
            if (window.supabaseService) {
                await window.supabaseService.saveDashboardSettings(settings);
                this.dashboardSettings = settings;
                this.dashboardSectionDisplay = settings.dashboard_section_display;
                this.columnSettings = settings.column_settings;
                
                // Re-render dashboard to apply new settings
                await this.renderDashboard();
                
                this.showNotification('Settings saved successfully!', 'success');
                this.closeSettingsModal();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings. Please try again.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Load archived data
    async loadData() {
        try {
            if (window.supabaseService) {
                // Load columns
                const columnsData = await window.supabaseService.getColumns();
                this.columns = columnsData.map(col => ({
                    id: col.id,
                    name: col.title,
                    order_index: col.position
                })) || [];
                
                // Load archived cards only
                const cardsData = await window.supabaseService.getArchivedCards();
                this.archivedCards = cardsData.map(card => {
                    const totalMinutes = card.duration || 0;
                    const durationHours = Math.floor(totalMinutes / 60);
                    const durationMinutes = totalMinutes % 60;
                    
                    return {
                        id: card.id,
                        title: card.title,
                        description: card.description,
                        category_id: card.category_id,
                        column_id: card.column_id,
                        duration_hours: durationHours,
                        duration_minutes: durationMinutes,
                        created_at: card.date_created || card.created_at,
                        assigned_date: card.date_created,
                        archived_at: card.archived_at
                    };
                }) || [];
                
                // Load categories
                const categoriesData = await window.supabaseService.getCategories();
                this.categories = categoriesData || [];
                
                // Create default columns if none exist
                if (this.columns.length === 0) {
                    await this.createDefaultColumns();
                }
            } else {
                console.error('Supabase service not available');
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async createDefaultColumns() {
        const defaultColumns = [
            { name: 'To Do', order_index: 0 },
            { name: 'In Progress', order_index: 1 },
            { name: 'Done', order_index: 2 }
        ];
        
        try {
            for (const columnData of defaultColumns) {
                await this.addColumn(columnData.name);
            }
        } catch (error) {
            console.error('Error creating default columns:', error);
        }
    }

    // Column management
    async addColumn(name) {
        try {
            if (window.supabaseService) {
                const newColumn = await window.supabaseService.createColumn({
                    name: name,
                    order_index: this.columns.length
                });
                
                if (newColumn) {
                    this.columns.push(newColumn);
                    await this.renderDashboard();
                    this.showNotification(`Column "${name}" created successfully!`, 'success');
                }
            }
        } catch (error) {
            console.error('Error adding column:', error);
            this.showNotification('Failed to create column. Please try again.', 'error');
        }
    }

    async deleteColumn(columnId) {
        if (!confirm('Are you sure you want to delete this column? All archived cards in this column will be moved to the first column.')) {
            return;
        }
        
        try {
            if (window.supabaseService) {
                // Move all archived cards from this column to the first column
                const firstColumn = this.columns.find(col => col.id !== columnId);
                if (firstColumn) {
                    const cardsInColumn = this.archivedCards.filter(card => card.column_id === columnId);
                    for (const card of cardsInColumn) {
                        await window.supabaseService.updateCard(card.id, { column_id: firstColumn.id });
                    }
                }
                
                // Delete the column
                await window.supabaseService.deleteColumn(columnId);
                
                // Update local data
                this.columns = this.columns.filter(col => col.id !== columnId);
                await this.loadData(); // Reload to get updated card positions
                await this.renderDashboard();
                
                this.showNotification('Column deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting column:', error);
            this.showNotification('Failed to delete column. Please try again.', 'error');
        }
    }

    // Filter functionality
    openColumnFilter(columnId) {
        this.currentFilterColumnId = columnId;
        const modal = document.getElementById('filterModal');
        if (modal) {
            modal.style.display = 'block';
            this.populateFilterCategories();
            
            // Load existing filter for this column
            const existingFilter = this.columnFilters[columnId];
            if (existingFilter) {
                // Check the categories that are currently filtered
                existingFilter.categories.forEach(categoryId => {
                    const checkbox = document.querySelector(`input[data-category-id="${categoryId}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        }
    }

    populateFilterCategories() {
        const container = document.getElementById('filterCategories');
        if (container) {
            container.innerHTML = '';
            
            // Add "All Categories" option
            const allOption = document.createElement('div');
            allOption.className = 'filter-category-item';
            allOption.innerHTML = `
                <label>
                    <input type="checkbox" data-category-id="all" id="filterAllCategories">
                    <span class="category-color" style="background-color: #666;"></span>
                    All Categories
                </label>
            `;
            container.appendChild(allOption);
            
            // Add individual categories
            this.categories.forEach(category => {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'filter-category-item';
                categoryItem.innerHTML = `
                    <label>
                        <input type="checkbox" data-category-id="${category.id}">
                        <span class="category-color" style="background-color: ${category.color};"></span>
                        ${category.name}
                    </label>
                `;
                container.appendChild(categoryItem);
            });
        }
    }

    applyColumnFilter() {
        const selectedCategories = [];
        const checkboxes = document.querySelectorAll('#filterCategories input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            const categoryId = checkbox.getAttribute('data-category-id');
            if (categoryId !== 'all') {
                selectedCategories.push(categoryId);
            }
        });
        
        // Store filter for this column
        if (selectedCategories.length > 0) {
            this.columnFilters[this.currentFilterColumnId] = {
                categories: selectedCategories
            };
        } else {
            delete this.columnFilters[this.currentFilterColumnId];
        }
        
        // Re-render dashboard with filters applied
        this.renderDashboard();
        
        // Close modal
        document.getElementById('filterModal').style.display = 'none';
    }

    clearColumnFilter() {
        delete this.columnFilters[this.currentFilterColumnId];
        this.renderDashboard();
        document.getElementById('filterModal').style.display = 'none';
    }

    unselectAllCategories() {
        const checkboxes = document.querySelectorAll('#filterCategories input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    setupEventListeners() {
        // Navigation
        const backToDashboard = document.getElementById('backToDashboard');
        if (backToDashboard) {
            backToDashboard.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Logout functionality
        const logoffBtn = document.getElementById('logoffBtn');
        if (logoffBtn) {
            logoffBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Add Column functionality
        const addColumnBtn = document.getElementById('addColumnBtn');
        const addColumnModal = document.getElementById('addColumnModal');
        const addColumnForm = document.getElementById('addColumnForm');
        const cancelAddColumn = document.getElementById('cancelAddColumn');

        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => {
                if (addColumnModal) {
                    addColumnModal.style.display = 'block';
                    document.getElementById('columnName').focus();
                }
            });
        }

        if (cancelAddColumn) {
            cancelAddColumn.addEventListener('click', () => {
                if (addColumnModal) {
                    addColumnModal.style.display = 'none';
                    addColumnForm.reset();
                }
            });
        }

        if (addColumnForm) {
            addColumnForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const columnName = document.getElementById('columnName').value.trim();
                
                if (columnName) {
                    await this.addColumn(columnName);
                    addColumnModal.style.display = 'none';
                    addColumnForm.reset();
                }
            });
        }

        // Settings modal functionality
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const cancelSettings = document.getElementById('cancelSettings');
        const saveSettingsBtn = document.getElementById('saveSettings');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        if (cancelSettings) {
            cancelSettings.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Filter modal functionality
        const filterModal = document.getElementById('filterModal');
        const cancelFilter = document.getElementById('cancelFilter');
        const applyFilterBtn = document.getElementById('applyFilter');
        const clearFilterBtn = document.getElementById('clearFilter');
        const unselectAllBtn = document.getElementById('unselectAll');

        if (cancelFilter) {
            cancelFilter.addEventListener('click', () => {
                filterModal.style.display = 'none';
            });
        }

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                this.applyColumnFilter();
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                this.clearColumnFilter();
            });
        }

        if (unselectAllBtn) {
            unselectAllBtn.addEventListener('click', () => {
                this.unselectAllCategories();
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    updateCategoryOptions() {
        // This method can be used to update category dropdowns if needed
        // Currently not needed for archive page since we don't create cards
    }

    async renderDashboard() {
        const columnsContainer = document.querySelector('.columns-container');
        if (!columnsContainer) return;

        columnsContainer.innerHTML = '';

        // Sort columns by order_index
        const sortedColumns = [...this.columns].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        sortedColumns.forEach(column => {
            const columnElement = this.createColumnElement(column);
            columnsContainer.appendChild(columnElement);
        });
    }

    createColumnElement(column) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.setAttribute('data-column-id', column.id);

        // Get archived cards for this column
        let columnCards = this.archivedCards.filter(card => card.column_id === column.id);

        // Apply column filter if exists
        const columnFilter = this.columnFilters[column.id];
        if (columnFilter && columnFilter.categories.length > 0) {
            columnCards = columnCards.filter(card => 
                columnFilter.categories.includes(card.category_id)
            );
        }

        // Sort cards by created_at (newest first)
        columnCards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const cardCount = columnCards.length;
        const hasFilter = columnFilter && columnFilter.categories.length > 0;
        const filterIndicator = hasFilter ? ' 🔍' : '';

        columnDiv.innerHTML = `
            <div class="column-header">
                <div class="column-title-container">
                    <h3 class="column-title">${column.name}${filterIndicator}</h3>
                    <span class="card-count">${cardCount}</span>
                </div>
                <div class="column-actions">
                    <button class="column-action-btn filter-btn" onclick="archiveDashboard.openColumnFilter('${column.id}')" title="Filter">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                        </svg>
                    </button>
                    <button class="column-action-btn delete-btn" onclick="archiveDashboard.deleteColumn('${column.id}')" title="Delete Column">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="cards-container" data-column-id="${column.id}">
                ${this.renderCardsForColumn(column, columnCards)}
            </div>
        `;

        return columnDiv;
    }

    renderCardsForColumn(column, columnCards) {
        if (columnCards.length === 0) {
            return '<div class="no-cards-message">No archived cards</div>';
        }

        // Group cards by date and category
        const groupedCards = {};
        
        columnCards.forEach(card => {
            const dateKey = this.formatDate(card.created_at);
            if (!groupedCards[dateKey]) {
                groupedCards[dateKey] = {};
            }
            
            const category = this.categories.find(cat => cat.id === card.category_id);
            const categoryKey = category ? category.id : 'uncategorized';
            
            if (!groupedCards[dateKey][categoryKey]) {
                groupedCards[dateKey][categoryKey] = {
                    category: category,
                    cards: []
                };
            }
            
            groupedCards[dateKey][categoryKey].cards.push(card);
        });

        let html = '';
        
        // Sort dates (newest first)
        const sortedDates = Object.keys(groupedCards).sort((a, b) => new Date(b) - new Date(a));
        
        sortedDates.forEach(dateKey => {
            const dateGroups = groupedCards[dateKey];
            const totalCardsForDate = Object.values(dateGroups).reduce((sum, group) => sum + group.cards.length, 0);
            
            // Calculate total time for this date
            const totalTimeMs = Object.values(dateGroups).reduce((sum, group) => {
                return sum + group.cards.reduce((cardSum, card) => {
                    return cardSum + (card.duration_hours || 0) * 3600000 + (card.duration_minutes || 0) * 60000;
                }, 0);
            }, 0);
            
            const totalTimeFormatted = this.formatTime(totalTimeMs);
            const sectionHeader = this.formatSectionHeader(totalCardsForDate, totalTimeFormatted);
            
            html += `
                <div class="date-section">
                    <div class="date-header" onclick="archiveDashboard.toggleDateSection('${dateKey}-${column.id}')">
                        <span class="date-title">${dateKey}</span>
                        <span class="section-summary">${sectionHeader}</span>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="date-content" id="${dateKey}-${column.id}">
            `;
            
            // Sort categories by name
            const sortedCategories = Object.keys(dateGroups).sort((a, b) => {
                const catA = dateGroups[a].category;
                const catB = dateGroups[b].category;
                if (!catA && !catB) return 0;
                if (!catA) return 1;
                if (!catB) return -1;
                return catA.name.localeCompare(catB.name);
            });
            
            sortedCategories.forEach(categoryKey => {
                const group = dateGroups[categoryKey];
                const category = group.category;
                const categoryCards = group.cards;
                
                // Calculate total time for this category
                const categoryTimeMs = categoryCards.reduce((sum, card) => {
                    return sum + (card.duration_hours || 0) * 3600000 + (card.duration_minutes || 0) * 60000;
                }, 0);
                
                const categoryTimeFormatted = this.formatTime(categoryTimeMs);
                const categorySectionHeader = this.formatSectionHeader(categoryCards.length, categoryTimeFormatted);
                
                const categoryName = category ? category.name : 'Uncategorized';
                const categoryColor = category ? category.color : '#666';
                
                html += `
                    <div class="category-section">
                        <div class="category-header" onclick="archiveDashboard.toggleCategorySection('${categoryKey}-${dateKey}-${column.id}')">
                            <div class="category-info">
                                <span class="category-color" style="background-color: ${categoryColor};"></span>
                                <span class="category-name">${categoryName}</span>
                            </div>
                            <span class="section-summary">${categorySectionHeader}</span>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="category-content" id="${categoryKey}-${dateKey}-${column.id}">
                `;
                
                // Sort cards by created_at (newest first)
                categoryCards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                categoryCards.forEach(card => {
                    html += this.createCardHTML(card, column.id);
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    toggleDateSection(sectionId) {
        const section = document.getElementById(sectionId);
        const header = section?.previousElementSibling;
        const icon = header?.querySelector('.toggle-icon');
        
        if (section) {
            const isVisible = section.style.display !== 'none';
            section.style.display = isVisible ? 'none' : 'block';
            if (icon) {
                icon.textContent = isVisible ? '▶' : '▼';
            }
        }
    }

    toggleCategorySection(categoryId) {
        const section = document.getElementById(categoryId);
        const header = section?.previousElementSibling;
        const icon = header?.querySelector('.toggle-icon');
        
        if (section) {
            const isVisible = section.style.display !== 'none';
            section.style.display = isVisible ? 'none' : 'block';
            if (icon) {
                icon.textContent = isVisible ? '▶' : '▼';
            }
        }
    }

    createCardHTML(card, columnId = null) {
        const category = this.categories.find(cat => cat.id === card.category_id);
        const categoryName = category ? category.name : 'Uncategorized';
        const categoryColor = category ? category.color : '#666';
        const textColor = this.getContrastColor(categoryColor);
        
        const durationHours = card.duration_hours || 0;
        const durationMinutes = card.duration_minutes || 0;
        const totalMinutes = durationHours * 60 + durationMinutes;
        
        let durationDisplay = '';
        if (totalMinutes > 0) {
            if (durationHours > 0) {
                durationDisplay = durationMinutes > 0 ? 
                    `${durationHours}h ${durationMinutes}m` : 
                    `${durationHours}h`;
            } else {
                durationDisplay = `${durationMinutes}m`;
            }
        }
        
        const assignedDate = card.assigned_date ? this.formatDate(card.assigned_date) : '';
        
        return `
            <div class="card archived-card" data-card-id="${card.id}">
                <div class="card-header">
                    <div class="card-category" style="background-color: ${categoryColor}; color: ${textColor};">
                        ${categoryName}
                    </div>
                    <div class="card-actions">
                        <span class="archived-label">📦 Archived</span>
                    </div>
                </div>
                <div class="card-content">
                    <h4 class="card-title">${card.title}</h4>
                    ${card.description ? `<p class="card-description">${card.description}</p>` : ''}
                    <div class="card-meta">
                        ${durationDisplay ? `<span class="card-duration">⏱️ ${durationDisplay}</span>` : ''}
                        ${assignedDate ? `<span class="card-date">📅 ${assignedDate}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        
        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return '0m';
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    getContrastColor(hexColor) {
        // Remove # if present
        const color = hexColor.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
}

// Initialize the archive dashboard
const archiveDashboard = new ArchiveDashboard();

// Handle page load
window.addEventListener('load', () => {
    // Additional initialization if needed
});