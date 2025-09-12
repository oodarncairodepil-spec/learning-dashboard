// Supabase Database Service
class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.currentUser = null;
    }

    async init() {
        if (this.initialized) return;
        
        this.supabase = initSupabase();
        if (!this.supabase) {
            throw new Error('Failed to initialize Supabase client');
        }
        
        this.initialized = true;
        console.log('Supabase service initialized');
    }

    // Authentication methods
    async authenticateUser(email, password) {
        await this.init();
        
        // Simple password verification (in production, use proper hashing)
        const users = {
            'kalantara.waranggana@gmail.com': 'abc123',
            'ligar.pandika@gmail.com': 'cba321'
        };
        
        if (users[email] && users[email] === password) {
            // Get user from database
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            
            if (error) {
                console.error('Error fetching user:', error);
                throw new Error('Authentication failed');
            }
            
            this.currentUser = data;
            return data;
        } else {
            throw new Error('Invalid credentials');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    async getUserByEmail(email) {
        await this.init();
        
        // First check if users table exists and has any data
        const { data: allUsers, error: tableError } = await this.supabase
            .from('users')
            .select('email')
            .limit(5);
            
        if (tableError) {
            console.error('Error accessing users table:', tableError);
            console.log('This usually means the database schema has not been executed in Supabase yet.');
            return null;
        }
        
        console.log('Users table exists. Found users:', allUsers?.map(u => u.email) || 'none');
        
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle(); // Use maybeSingle instead of single to handle 0 results
        
        if (error) {
            console.error('Error fetching user by email:', error);
            return null;
        }
        
        if (!data) {
            console.log(`No user found with email: ${email}`);
            console.log('Available users in database:', allUsers?.map(u => u.email) || 'none');
        }
        
        return data;
    }

    // Column operations
    async getColumns() {
        await this.init();
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        const { data, error } = await this.supabase
            .from('columns')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .order('position', { ascending: true });
        
        if (error) {
            console.error('Error fetching columns:', error);
            return [];
        }
        
        return data || [];
    }

    async createColumn(title, position) {
        await this.init();
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        const { data, error } = await this.supabase
            .from('columns')
            .insert([{ title, position, user_id: this.currentUser.id }])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating column:', error);
            throw error;
        }
        
        return data;
    }

    async updateColumn(id, updates) {
        await this.init();
        const { data, error } = await this.supabase
            .from('columns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating column:', error);
            throw error;
        }
        
        return data;
    }

    async deleteColumn(id) {
        await this.init();
        const { error } = await this.supabase
            .from('columns')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting column:', error);
            throw error;
        }
    }

    async reorderColumns(columns) {
        await this.init();
        const updates = columns.map((column, index) => ({
            id: column.id,
            position: index
        }));

        for (const update of updates) {
            await this.updateColumn(update.id, { position: update.position });
        }
    }

    // Category operations
    async getCategories() {
        await this.init();
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        const { data, error } = await this.supabase
            .from('categories')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
        
        return data || [];
    }

    async createCategory(name, color = '#007bff') {
        await this.init();
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        const { data, error } = await this.supabase
            .from('categories')
            .insert([{ name, color, user_id: this.currentUser.id }])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating category:', error);
            throw error;
        }
        
        return data;
    }

    async updateCategory(id, updates) {
        await this.init();
        const { data, error } = await this.supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating category:', error);
            throw error;
        }
        
        return data;
    }

    async deleteCategory(id) {
        await this.init();
        const { error } = await this.supabase
            .from('categories')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    // Card operations
    async getCards() {
        await this.init();
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        const { data, error } = await this.supabase
            .from('cards')
            .select(`
                *,
                categories (id, name, color),
                columns (id, title)
            `)
            .eq('user_id', this.currentUser.id)
            .order('position', { ascending: true });
        
        if (error) {
            console.error('Error fetching cards:', error);
            return [];
        }
        
        return data || [];
    }

    async createCard(cardData) {
        await this.init();
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        // Add user_id to card data
        const cardWithUser = { ...cardData, user_id: this.currentUser.id };
        
        const { data, error } = await this.supabase
            .from('cards')
            .insert([cardWithUser])
            .select(`
                *,
                categories (id, name, color),
                columns (id, title)
            `)
            .single();
        
        if (error) {
            console.error('Error creating card:', error);
            throw error;
        }
        
        return data;
    }

    async updateCard(id, updates) {
        await this.init();
        const { data, error } = await this.supabase
            .from('cards')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                categories (id, name, color),
                columns (id, title)
            `)
            .single();
        
        if (error) {
            console.error('Error updating card:', error);
            throw error;
        }
        
        return data;
    }

    async deleteCard(id) {
        await this.init();
        const { error } = await this.supabase
            .from('cards')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting card:', error);
            throw error;
        }
    }

    async moveCard(cardId, newColumnId, newPosition, completionDate = null) {
        await this.init();
        
        // Prepare update data
        const updateData = { 
            column_id: newColumnId, 
            position: newPosition 
        };
        
        // Add completion_date if provided
        if (completionDate !== null) {
            updateData.completion_date = completionDate;
        }
        
        // Update the card's column and position
        const { data, error } = await this.supabase
            .from('cards')
            .update(updateData)
            .eq('id', cardId)
            .select(`
                *,
                categories (id, name, color),
                columns (id, title)
            `)
            .single();
        
        if (error) {
            console.error('Error moving card:', error);
            throw error;
        }
        
        return data;
    }

    async reorderCards(columnId, cardIds) {
        await this.init();
        
        for (let i = 0; i < cardIds.length; i++) {
            await this.updateCard(cardIds[i], { 
                column_id: columnId,
                position: i 
            });
        }
    }
}

// Create global instance
const supabaseService = new SupabaseService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseService;
}