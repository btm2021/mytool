class RateLimiter {
    constructor(requestsPerMinute) {
        this.requestsPerMinute = requestsPerMinute;
        this.queue = [];
        this.processing = false;
        this.requestTimes = [];
    }

    async execute(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            // Clean old request times (older than 1 minute)
            const now = Date.now();
            this.requestTimes = this.requestTimes.filter(t => now - t < 60000);

            // Check if we can make a request
            if (this.requestTimes.length >= this.requestsPerMinute) {
                // Wait until we can make another request
                const oldestRequest = this.requestTimes[0];
                const waitTime = 60000 - (now - oldestRequest);
                await this.sleep(waitTime);
                continue;
            }

            // Execute next request
            const { fn, resolve, reject } = this.queue.shift();
            this.requestTimes.push(Date.now());

            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                reject(error);
            }

            // Small delay between requests
            await this.sleep(100);
        }

        this.processing = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getQueueLength() {
        return this.queue.length;
    }

    getRequestCount() {
        const now = Date.now();
        return this.requestTimes.filter(t => now - t < 60000).length;
    }
}
