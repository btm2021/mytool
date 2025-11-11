/**
 * LocalStorage Save/Load Adapter for TradingView
 * Implement đầy đủ chức năng của TradingView Save/Load REST API
 * Lưu trữ charts, study templates, drawings, và drawing templates vào localStorage
 */
class LocalStorageSaveLoadAdapter {
    constructor() {
        this.storageKeys = {
            charts: 'tv_charts',
            studyTemplates: 'tv_study_templates',
            drawingTemplates: 'tv_drawing_templates',
            drawings: 'tv_drawings'
        };
        this._initStorage();
    }

    _initStorage() {
        Object.values(this.storageKeys).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
    }

    _getData(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            console.error(`Error loading ${key}:`, e);
            return [];
        }
    }

    _setData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${key}:`, e);
        }
    }

    // ==================== CHART METHODS ====================

    /**
     * Get all saved charts (TradingView compatible)
     */
    getCharts() {
        const charts = this._getData(this.storageKeys.charts);
        return Promise.resolve(
            charts.map(chart => ({
                id: chart.id,
                name: chart.name,
                symbol: chart.symbol,
                resolution: chart.resolution,
                timestamp: chart.timestamp
            }))
        );
    }

    /**
     * Alias for getCharts
     */
    getAllCharts() {
        return this.getCharts();
    }

    /**
     * Remove a chart by ID
     */
    removeChart(chartId) {
        const charts = this._getData(this.storageKeys.charts);
        const filtered = charts.filter(c => c.id !== chartId);
        this._setData(this.storageKeys.charts, filtered);
        return Promise.resolve();
    }

    /**
     * Save a new chart or update existing
     */
    saveChart(chartData) {
        const charts = this._getData(this.storageKeys.charts);
        
        const chart = {
            id: chartData.id || `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: chartData.name,
            symbol: chartData.symbol,
            resolution: chartData.resolution,
            content: chartData.content,
            timestamp: Date.now()
        };

        const existingIndex = charts.findIndex(c => c.id === chart.id);
        if (existingIndex >= 0) {
            charts[existingIndex] = chart;
        } else {
            charts.push(chart);
        }

        this._setData(this.storageKeys.charts, charts);
        return Promise.resolve(chart.id);
    }

    /**
     * Load a chart by ID
     */
    loadChart(chartId) {
        const charts = this._getData(this.storageKeys.charts);
        const chart = charts.find(c => c.id === chartId);
        
        if (chart) {
            return Promise.resolve(chart.content);
        }
        
        return Promise.reject('Chart not found');
    }

    /**
     * Get chart content by ID (alias)
     */
    getChartContent(chartId) {
        return this.loadChart(chartId);
    }

    // ==================== STUDY TEMPLATE METHODS ====================

    /**
     * Get all study template names (TradingView compatible)
     */
    getStudyTemplates() {
        const templates = this._getData(this.storageKeys.studyTemplates);
        return Promise.resolve(templates.map(t => t.name));
    }

    /**
     * Alias for getStudyTemplates
     */
    getAllStudyTemplates() {
        return this.getStudyTemplates();
    }

    /**
     * Remove a study template by name
     */
    removeStudyTemplate(templateName) {
        const templates = this._getData(this.storageKeys.studyTemplates);
        const filtered = templates.filter(t => t.name !== templateName);
        this._setData(this.storageKeys.studyTemplates, filtered);
        return Promise.resolve();
    }

    /**
     * Save a study template
     */
    saveStudyTemplate(templateData) {
        const templates = this._getData(this.storageKeys.studyTemplates);
        
        const template = {
            name: templateData.name,
            content: templateData.content
        };

        const existingIndex = templates.findIndex(t => t.name === template.name);
        if (existingIndex >= 0) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }

        this._setData(this.storageKeys.studyTemplates, templates);
        return Promise.resolve();
    }

    /**
     * Load a study template by name
     */
    loadStudyTemplate(templateName) {
        const templates = this._getData(this.storageKeys.studyTemplates);
        const template = templates.find(t => t.name === templateName);
        
        if (template) {
            return Promise.resolve(template.content);
        }
        
        return Promise.reject('Study template not found');
    }

    /**
     * Get study template content by name (alias)
     */
    getStudyTemplateContent(templateName) {
        return this.loadStudyTemplate(templateName);
    }

    // ==================== DRAWING TEMPLATE METHODS ====================

    /**
     * Get all drawing template names (alias for TradingView compatibility)
     */
    getDrawingTemplates() {
        const templates = this._getData(this.storageKeys.drawingTemplates);
        return Promise.resolve(templates.map(t => t.name));
    }

    /**
     * Alias for getDrawingTemplates
     */
    getAllDrawingTemplates() {
        return this.getDrawingTemplates();
    }

    /**
     * Remove a drawing template by name
     */
    removeDrawingTemplate(templateName) {
        const templates = this._getData(this.storageKeys.drawingTemplates);
        const filtered = templates.filter(t => t.name !== templateName);
        this._setData(this.storageKeys.drawingTemplates, filtered);
        return Promise.resolve();
    }

    /**
     * Save a drawing template
     */
    saveDrawingTemplate(templateData) {
        const templates = this._getData(this.storageKeys.drawingTemplates);
        
        const template = {
            name: templateData.name,
            content: templateData.content
        };

        const existingIndex = templates.findIndex(t => t.name === template.name);
        if (existingIndex >= 0) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }

        this._setData(this.storageKeys.drawingTemplates, templates);
        return Promise.resolve();
    }

    /**
     * Load a drawing template by name
     */
    loadDrawingTemplate(templateName) {
        const templates = this._getData(this.storageKeys.drawingTemplates);
        const template = templates.find(t => t.name === templateName);
        
        if (template) {
            return Promise.resolve(template.content);
        }
        
        return Promise.reject('Drawing template not found');
    }

    /**
     * Get drawing template content by name (alias)
     */
    getDrawingTemplateContent(templateName) {
        return this.loadDrawingTemplate(templateName);
    }

    // ==================== DRAWING METHODS ====================

    /**
     * Save line tools and groups (drawings)
     */
    saveLineToolsAndGroups(layoutId, chartId, state) {
        const allDrawings = this._getData(this.storageKeys.drawings);
        const key = `${layoutId}/${chartId}`;
        
        // Tìm hoặc tạo entry cho layout/chart này
        let drawingEntry = allDrawings.find(d => d.key === key);
        if (!drawingEntry) {
            drawingEntry = { key, sources: {} };
            allDrawings.push(drawingEntry);
        }

        // Update sources
        const sources = state.sources;
        if (sources) {
            for (let [sourceKey, sourceState] of sources) {
                if (sourceState === null) {
                    delete drawingEntry.sources[sourceKey];
                } else {
                    drawingEntry.sources[sourceKey] = sourceState;
                }
            }
        }

        this._setData(this.storageKeys.drawings, allDrawings);
        return Promise.resolve();
    }

    /**
     * Load line tools and groups (drawings)
     */
    loadLineToolsAndGroups(layoutId, chartId, requestType, requestContext) {
        const allDrawings = this._getData(this.storageKeys.drawings);
        const key = `${layoutId}/${chartId}`;
        
        const drawingEntry = allDrawings.find(d => d.key === key);
        
        if (!drawingEntry || !drawingEntry.sources) {
            return Promise.resolve(null);
        }

        const sources = new Map();
        for (let [sourceKey, sourceState] of Object.entries(drawingEntry.sources)) {
            sources.set(sourceKey, sourceState);
        }

        return Promise.resolve({ sources });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageSaveLoadAdapter;
}
