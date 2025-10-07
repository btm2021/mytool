// Supabase Save/Load Adapter for TradingView
class SupabaseSaveLoadAdapter {
    constructor(supabaseUrl, supabaseKey, fixedUserId = 'default-user') {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.supabase = null;
        // Sử dụng 1 user ID cố định cho tất cả
        this.userId = fixedUserId;
        this.initSupabase();
    }

    initSupabase() {
        // Khởi tạo Supabase client từ CDN
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
    }

    // Lấy tất cả layouts
    async getAllCharts() {
        const { data, error } = await this.supabase
            .from('chart_layouts')
            .select('id, name, created_at, updated_at')
            .eq('user_id', this.userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error getting charts:', error);
            throw error;
        }

        return data.map(layout => ({
            id: layout.id,
            name: layout.name,
            timestamp: new Date(layout.updated_at).getTime() / 1000
        }));
    }

    // Xóa layout
    async removeChart(chartId) {
        const { error } = await this.supabase
            .from('chart_layouts')
            .delete()
            .eq('id', chartId)
            .eq('user_id', this.userId);

        if (error) {
            console.error('Error removing chart:', error);
            throw error;
        }
    }

    // Lưu layout
    async saveChart(chartData) {
        const layoutData = {
            user_id: this.userId,
            name: chartData.name,
            content: chartData.content,
            updated_at: new Date().toISOString()
        };

        if (chartData.id) {
            // Update existing
            const { data, error } = await this.supabase
                .from('chart_layouts')
                .update(layoutData)
                .eq('id', chartData.id)
                .eq('user_id', this.userId)
                .select()
                .single();

            if (error) {
                console.error('Error updating chart:', error);
                throw error;
            }
            return data.id;
        } else {
            // Create new
            layoutData.created_at = new Date().toISOString();
            const { data, error } = await this.supabase
                .from('chart_layouts')
                .insert([layoutData])
                .select()
                .single();

            if (error) {
                console.error('Error creating chart:', error);
                throw error;
            }
            return data.id;
        }
    }

    // Tải layout
    async getChartContent(chartId) {
        const { data, error } = await this.supabase
            .from('chart_layouts')
            .select('content')
            .eq('id', chartId)
            .eq('user_id', this.userId)
            .single();

        if (error) {
            console.error('Error getting chart content:', error);
            throw error;
        }
        return data.content;
    }

    // Lấy tất cả study templates (nếu cần)
    async getAllStudyTemplates() {
        return [];
    }

    async removeStudyTemplate(templateName) {
        // Implement if needed
    }

    async saveStudyTemplate(templateData) {
        // Implement if needed
    }

    async getStudyTemplateContent(templateName) {
        // Implement if needed
    }

    // Lấy drawing templates (nếu cần)
    async getDrawingTemplates() {
        return [];
    }

    async loadDrawingTemplate(templateName) {
        // Implement if needed
    }

    async removeDrawingTemplate(templateName) {
        // Implement if needed
    }

    async saveDrawingTemplate(templateName, content) {
        // Implement if needed
    }
}
