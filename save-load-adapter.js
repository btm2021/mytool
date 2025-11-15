/**
 * Save/Load Adapter for TradingView
 * Lưu và load chart layouts, drawings, indicators từ localStorage
 */

class SaveLoadAdapter {
    constructor() {
        this.storageKey = 'tradingview_charts';
        this.currentChartId = null;
    }

    /**
     * Get all saved charts
     */
    getAllCharts() {
        const chartsData = localStorage.getItem(this.storageKey);
        if (!chartsData) {
            return this.getDefaultCharts();
        }
        try {
            return JSON.parse(chartsData);
        } catch (error) {
            console.error('Error parsing charts data:', error);
            return this.getDefaultCharts();
        }
    }

    /**
     * Get default charts structure
     */
    getDefaultCharts() {
        return [
            {
                id: 'default',
                name: 'Default Layout',
                symbol: 'BINANCE:BTCUSDT',
                resolution: '15',
                timestamp: Date.now(),
                content: null
            }
        ];
    }

    /**
     * Save chart
     */
    saveChart(chartData) {
        const charts = this.getAllCharts();
        const existingIndex = charts.findIndex(c => c.id === chartData.id);

        if (existingIndex >= 0) {
            charts[existingIndex] = {
                ...charts[existingIndex],
                ...chartData,
                timestamp: Date.now()
            };
        } else {
            charts.push({
                ...chartData,
                timestamp: Date.now()
            });
        }

        localStorage.setItem(this.storageKey, JSON.stringify(charts));
        return chartData.id;
    }

    /**
     * Load chart by ID
     */
    loadChart(chartId) {
        const charts = this.getAllCharts();
        return charts.find(c => c.id === chartId) || null;
    }

    /**
     * Delete chart
     */
    removeChart(chartId) {
        const charts = this.getAllCharts();
        const filtered = charts.filter(c => c.id !== chartId);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    }

    /**
     * Get all chart metadata (without content)
     */
    getAllChartMetadata() {
        const charts = this.getAllCharts();
        return charts.map(chart => ({
            id: chart.id,
            name: chart.name,
            symbol: chart.symbol,
            resolution: chart.resolution,
            timestamp: chart.timestamp
        }));
    }

    /**
     * Generate unique chart ID
     */
    generateChartId() {
        return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * TradingView Save/Load Adapter Interface
     */
    getAdapter() {
        return {
            // Get all saved charts
            getAllCharts: () => {
                return Promise.resolve(this.getAllChartMetadata());
            },

            // Remove chart
            removeChart: (chartId) => {
                this.removeChart(chartId);
                return Promise.resolve();
            },

            // Save chart
            saveChart: (chartData) => {
                console.log('SaveLoadAdapter.saveChart called:', chartData);
                const chartId = chartData.id || this.generateChartId();
                const dataToSave = {
                    id: chartId,
                    name: chartData.name,
                    symbol: chartData.symbol,
                    resolution: chartData.resolution,
                    content: chartData.content,
                    timestamp: Date.now()
                };
                this.saveChart(dataToSave);
                console.log('Chart saved to localStorage with ID:', chartId);
                return Promise.resolve(chartId);
            },

            // Get chart content
            getChartContent: (chartId) => {
                const chart = this.loadChart(chartId);
                return Promise.resolve(chart ? chart.content : null);
            },

            // Remove study template
            removeStudyTemplate: (studyTemplateData) => {
                const key = `study_template_${studyTemplateData.name}`;
                localStorage.removeItem(key);
                return Promise.resolve();
            },

            // Get study template content
            getStudyTemplateContent: (studyTemplateData) => {
                const key = `study_template_${studyTemplateData.name}`;
                const content = localStorage.getItem(key);
                return Promise.resolve(content ? JSON.parse(content) : null);
            },

            // Save study template
            saveStudyTemplate: (studyTemplateData) => {
                const key = `study_template_${studyTemplateData.name}`;
                localStorage.setItem(key, JSON.stringify(studyTemplateData.content));
                return Promise.resolve();
            },

            // Get all study templates
            getAllStudyTemplates: () => {
                const templates = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('study_template_')) {
                        const name = key.replace('study_template_', '');
                        templates.push({ name });
                    }
                }
                return Promise.resolve(templates);
            },

            // Get drawing templates
            getDrawingTemplates: (toolName) => {
                const key = `drawing_template_${toolName}`;
                const templates = localStorage.getItem(key);
                return Promise.resolve(templates ? JSON.parse(templates) : []);
            },

            // Load drawing template
            loadDrawingTemplate: (toolName, templateName) => {
                const key = `drawing_template_${toolName}`;
                const templates = localStorage.getItem(key);
                if (templates) {
                    const parsed = JSON.parse(templates);
                    const template = parsed.find(t => t.name === templateName);
                    return Promise.resolve(template ? template.content : null);
                }
                return Promise.resolve(null);
            },

            // Remove drawing template
            removeDrawingTemplate: (toolName, templateName) => {
                const key = `drawing_template_${toolName}`;
                const templates = localStorage.getItem(key);
                if (templates) {
                    const parsed = JSON.parse(templates);
                    const filtered = parsed.filter(t => t.name !== templateName);
                    localStorage.setItem(key, JSON.stringify(filtered));
                }
                return Promise.resolve();
            },

            // Save drawing template
            saveDrawingTemplate: (toolName, templateName, content) => {
                const key = `drawing_template_${toolName}`;
                const templates = localStorage.getItem(key);
                const parsed = templates ? JSON.parse(templates) : [];
                
                const existingIndex = parsed.findIndex(t => t.name === templateName);
                if (existingIndex >= 0) {
                    parsed[existingIndex].content = content;
                } else {
                    parsed.push({ name: templateName, content });
                }
                
                localStorage.setItem(key, JSON.stringify(parsed));
                return Promise.resolve();
            }
        };
    }
}

// Export
window.SaveLoadAdapter = SaveLoadAdapter;
