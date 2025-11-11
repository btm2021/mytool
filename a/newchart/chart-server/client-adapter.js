// TradingView Save/Load Adapter cho Node.js backend
// Copy code này vào app.js của bạn

class NodeBackendSaveLoadAdapter {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.userId = 'public_user'; // Có thể thay đổi theo user thực tế
    }

    getAllCharts() {
        return fetch(`${this.serverUrl}/charts?client=${this.userId}`)
            .then(response => response.json())
            .then(result => {
                if (result.status === 'ok') {
                    return result.data;
                }
                throw new Error(result.message || 'Failed to get charts');
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
            });
    }
}

// Cách sử dụng trong app.js:
// const SERVER_URL = 'https://your-server.koyeb.app'; // Thay bằng URL server của bạn
// saveLoadAdapter = new NodeBackendSaveLoadAdapter(SERVER_URL);
