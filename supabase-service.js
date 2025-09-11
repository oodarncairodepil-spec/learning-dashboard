// Supabase Database Service
class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
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

    // Column operations
    async getColumns() {
        await this.init();
        const { data, error } = await this.supabase
            .from('columns')
            .select('*')
            .order('position', { ascending: true });
        
        if (error) {
            console.error('Error fetching columns:', error);
            return [];
        }
        
        return data || [];
    }

    async createColumn(title, position) {
        await this.init();
        const { data, error } = await this.supabase
            .from('columns')
            .insert([{ title, position }])
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
        const { data, error } = await this.supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
        
        return data || [];
    }

    async createCategory(name, color = '#007bff') {
        await this.init();
        const { data, error } = await this.supabase
            .from('categories')
            .insert([{ name, color }])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating category:', error);
            throw error;
        }
        
        return data;
    }

    // Card operations
    async getCards() {
        await this.init();
        const { data, error } = await this.supabase
            .from('cards')
            .select(`
                *,
                categories (id, name, color),
                columns (id, title)
            `)
            .order('position', { ascending: true });
        
        if (error) {
            console.error('Error fetching cards:', error);
            return [];
        }
        
        return data || [];
    }

    async createCard(cardData) {
        await this.init();
        const { data, error } = await this.supabase
            .from('cards')
            .insert([cardData])
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

    async moveCard(cardId, newColumnId, newPosition) {
        await this.init();
        
        // Update the card's column and position
        const { data, error } = await this.supabase
            .from('cards')
            .update({ 
                column_id: newColumnId, 
                position: newPosition 
            })
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