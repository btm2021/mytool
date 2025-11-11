// Node.js Backend Save/Load Adapter for TradingView
// Implements IExternalSaveLoadAdapter interface
class NodeBackendSaveLoadAdapter {
    constructor(serverUrl, userId = 'public_user') {
        this.serverUrl = serverUrl;
        this.userId = userId;
    }

    // ============ Chart Layouts ============
    
    getAllCharts() {
        return fetch(`${this.serverUrl}/charts?client=${this.userId}`)
            .then(response => response.json())
            .then(result => {
                if (result.status === 'ok') {
                    return result.data;
                }
                throw new Error(result.message || 'Failed to get charts');
            })
            .catch(error => {
                console.error('Error getting all charts:', error);
                return [];
            });
    }

    removeChart(chartId) {
        return fetch(`${this.serverUrl}/charts/${chartId}?client=${this.userId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'ok') {
                    return;
                }
                throw new Error(result.message || 'Failed to remove chart');
            })
            .catch(error => {
                console.error('Error removing chart:', error);
                throw error;
            });
    }

    saveChart(chartData) {
        const body = {
            id: chartData.id,
            name: chartData.name,
            content: chartData.content,
            symbol: chartData.symbol,
            resolution: chartData.resolution
        };

        return fetch(`${this.serverUrl}/charts?client=${this.userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'ok') {
                    return result.id;
                }
                throw new Error(result.message || 'Failed to save chart');
            })
            .catch(error => {
                console.error('Error saving chart:', error);
                throw error;
            });
    }

    getChartContent(chartId) {
        return fetch(`${this.serverUrl}/charts/${chartId}?client=${this.userId}`)
            .then(response => response.json())
            .then(result => {
                if (result.status === 'ok') {
                    return result.data;
                }
                throw new Error(result.message || 'Failed to get chart content');
            })
            .catch(error => {
                console.error('Error getting chart content:', error);
                throw error;
            });
    }

    // ============ Chart Templates ============
    
    getAllChartTemplates() {
        // Chart templates are stored in localStorage for simplicity
        const templates = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chart_template_')) {
                templates.push(key.replace('chart_template_', ''));
            }
        }
        return Promise.resolve(templates);
    }

    saveChartTemplate(templateName, content) {
        localStorage.setItem(`chart_template_${templateName}`, JSON.stringify(content));
        return Promise.resolve();
    }

    getChartTemplateContent(templateName) {
        const content = localStorage.getItem(`chart_template_${templateName}`);
        if (!content) {
            return Promise.reject(new Error('Template not found'));
        }
        return Promise.resolve(JSON.parse(content));
    }

    removeChartTemplate(templateName) {
        localStorage.removeItem(`chart_template_${templateName}`);
        return Promise.resolve();
    }

    // ============ Study Templates (Indicators) ============
    
    getAllStudyTemplates() {
        const templates = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('study_template_')) {
                const name = key.replace('study_template_', '');
                templates.push({ name });
            }
        }
        return Promise.resolve(templates);
    }

    saveStudyTemplate(studyTemplateData) {
        localStorage.setItem(
            `study_template_${studyTemplateData.name}`,
            studyTemplateData.content
        );
        return Promise.resolve();
    }

    getStudyTemplateContent(studyTemplateInfo) {
        const content = localStorage.getItem(`study_template_${studyTemplateInfo.name}`);
        if (!content) {
            return Promise.reject(new Error('Study template not found'));
        }
        return Promise.resolve(content);
    }

    removeStudyTemplate(studyTemplateInfo) {
        localStorage.removeItem(`study_template_${studyTemplateInfo.name}`);
        return Promise.resolve();
    }

    // ============ Drawing Templates ============
    
    getDrawingTemplates(toolName) {
        const templates = [];
        const prefix = `drawing_template_${toolName}_`;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                templates.push(key.replace(prefix, ''));
            }
        }
        return Promise.resolve(templates);
    }

    saveDrawingTemplate(toolName, templateName, content) {
        localStorage.setItem(
            `drawing_template_${toolName}_${templateName}`,
            content
        );
        return Promise.resolve();
    }

    loadDrawingTemplate(toolName, templateName) {
        const content = localStorage.getItem(`drawing_template_${toolName}_${templateName}`);
        if (!content) {
            return Promise.reject(new Error('Drawing template not found'));
        }
        return Promise.resolve(content);
    }

    removeDrawingTemplate(toolName, templateName) {
        localStorage.removeItem(`drawing_template_${toolName}_${templateName}`);
        return Promise.resolve();
    }

    // ============ Line Tools and Groups (Optional - for separate drawings storage) ============
    
    saveLineToolsAndGroups(layoutId, chartId, state) {
        // Optional: implement if you want to save drawings separately
        // For now, drawings are saved within chart layout
        return Promise.resolve();
    }

    loadLineToolsAndGroups(layoutId, chartId, requestType, requestContext) {
        // Optional: implement if you want to load drawings separately
        // For now, drawings are loaded within chart layout
        return Promise.resolve({});
    }
}
