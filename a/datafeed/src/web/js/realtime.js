// Realtime data management
export function createRealtimeMixin() {
  return {
    data() {
      return {
        realtimeDataMap: new Map()
      };
    },
    
    computed: {
      realtimeData() {
        return Array.from(this.realtimeDataMap.values())
          .sort((a, b) => b.timestamp - a.timestamp);
      }
    },
    
    methods: {
      updateRealtimeData(data) {
        const key = `${data.exchange}_${data.symbol}_${data.interval}`;
        const oldData = this.realtimeDataMap.get(key);
        const oldPrice = oldData?.close;
        const newPrice = data.c;
        
        let flashClass = '';
        if (oldPrice !== undefined && newPrice !== undefined && oldPrice !== newPrice) {
          flashClass = newPrice > oldPrice ? 'price-flash-green' : 'price-flash-red';
        }
        
        this.realtimeDataMap.set(key, {
          key,
          exchange: data.exchange,
          symbol: data.symbol,
          interval: data.interval,
          close: data.c || '-',
          volume: data.v?.toFixed(2) || '-',
          time: new Date().toLocaleTimeString(),
          status: data.closed ? '🟢' : '🔵',
          flashClass,
          timestamp: Date.now()
        });
        
        // Clear flash after animation
        if (flashClass) {
          setTimeout(() => {
            const item = this.realtimeDataMap.get(key);
            if (item) {
              item.flashClass = '';
            }
          }, 500);
        }
      },
      
      removeRealtimeData(exchange, symbol) {
        // Remove all entries for this symbol
        const keysToRemove = [];
        for (const [key, data] of this.realtimeDataMap.entries()) {
          if (data.exchange === exchange && data.symbol === symbol) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => this.realtimeDataMap.delete(key));
      },
      
      clearRealtimeDataForExchange(exchange) {
        // Remove all entries for this exchange
        const keysToRemove = [];
        for (const [key, data] of this.realtimeDataMap.entries()) {
          if (data.exchange === exchange) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => this.realtimeDataMap.delete(key));
      }
    }
  };
}
