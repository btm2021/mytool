export function setupWebSocket(wss, parentPort, workerStatus, log) {
    wss.on('connection', (ws) => {
        log('WebSocket client connected', 'info');

        ws.send(JSON.stringify({
            type: 'log',
            data: {
                message: 'Connected to server',
                type: 'connected',
                timestamp: new Date().toISOString()
            }
        }));
        
        // Send current worker status to new client
        if (Object.keys(workerStatus).length > 0) {
            ws.send(JSON.stringify({
                type: 'worker_status',
                data: workerStatus
            }));
        }

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'command') {
                    // Forward command to main thread
                    parentPort.postMessage({
                        type: 'command',
                        data: message.data
                    });
                }
            } catch (err) {
                log(`WebSocket message error: ${err.message}`, 'error');
            }
        });

        ws.on('close', () => {
            log('WebSocket client disconnected', 'info');
        });
    });
}

export function handleParentMessages(wss, workerStatus) {
    return (message) => {
        if (message.type === 'broadcast') {
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify(message.data));
                }
            });
        } else if (message.type === 'update_status') {
            Object.assign(workerStatus, message.status);
            // Broadcast status to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: 'worker_status',
                        data: workerStatus
                    }));
                }
            });
        } else if (message.type === 'system_info') {
            // Broadcast system info to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: 'system_info',
                        data: message.data
                    }));
                }
            });
        } else if (message.type === 'worker_metrics') {
            // Broadcast worker metrics to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: 'worker_metrics',
                        data: message.data
                    }));
                }
            });
        }
    };
}
