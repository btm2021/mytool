// Initialize PocketBase
const pb = new PocketBase('https://btm2021.pockethost.io');

new Vue({
  el: '#app',
  data() {
    return {
      activeTab: 'log',
      loading: false,
      connectionStatus: 'Connecting...',
      
      // Events
      events: [],
      eventForm: {
        name: '',
        type: '',
        data: '',
        comment: ''
      },
      
      // Logs
      logs: [],
      selectedEventId: null,
      logForm: {
        side: 'long',
        result: 'win',
        notes: ''
      },
      
      sideOptions: [
        { text: 'Long', value: 'long' },
        { text: 'Short', value: 'short' }
      ],
      
      resultOptions: [
        { text: 'Win', value: 'win' },
        { text: 'Loss', value: 'loss' },
        { text: 'Breakeven', value: 'breakeven' }
      ]
    };
  },
  
  computed: {
    eventOptions() {
      return this.events.map(e => ({
        value: e.id,
        text: e.name
      }));
    },
    
    selectedEvent() {
      if (!this.selectedEventId) return null;
      return this.events.find(e => e.id === this.selectedEventId);
    },
    
    sortedLogs() {
      return [...this.logs].sort((a, b) => new Date(b.created) - new Date(a.created));
    }
  },
  
  methods: {
    // Load Events
    async loadEvents() {
      try {
        this.loading = true;
        const records = await pb.collection('events').getFullList({
          sort: '-created'
        });
        this.events = records;
        this.connectionStatus = 'Connected';
      } catch (error) {
        console.error('Error loading events:', error);
        this.connectionStatus = 'Error';
        this.$bvToast.toast('Failed to load events', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.loading = false;
      }
    },
    
    // Create Event
    async createEvent() {
      if (!this.eventForm.name) return;
      
      try {
        this.loading = true;
        const data = {
          name: this.eventForm.name,
          type: this.eventForm.type || '',
          data: this.eventForm.data || '',
          comment: this.eventForm.comment || ''
        };
        
        await pb.collection('events').create(data);
        
        this.$bvToast.toast('Event created successfully', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 2000
        });
        
        // Reset form
        this.eventForm = {
          name: '',
          type: '',
          data: '',
          comment: ''
        };
        
        // Reload events
        await this.loadEvents();
      } catch (error) {
        console.error('Error creating event:', error);
        this.$bvToast.toast('Failed to create event', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.loading = false;
      }
    },
    
    // Delete Event
    async deleteEvent(id) {
      if (!confirm('Delete this event?')) return;
      
      try {
        this.loading = true;
        await pb.collection('events').delete(id);
        
        this.$bvToast.toast('Event deleted', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 2000
        });
        
        await this.loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        this.$bvToast.toast('Failed to delete event', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.loading = false;
      }
    },
    
    // Load Logs
    async loadLogs() {
      try {
        this.loading = true;
        const records = await pb.collection('logs').getFullList({
          sort: '-created'
        });
        this.logs = records;
      } catch (error) {
        console.error('Error loading logs:', error);
        this.$bvToast.toast('Failed to load logs', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.loading = false;
      }
    },
    
    // Log Event
    async logEvent() {
      if (!this.selectedEventId) return;
      
      try {
        this.loading = true;
        const data = {
          event_id: this.selectedEventId,
          side: this.logForm.side,
          result: this.logForm.result,
          notes: this.logForm.notes || ''
        };
        
        await pb.collection('logs').create(data);
        
        this.$bvToast.toast('Event logged successfully', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 2000
        });
        
        // Reset form
        this.selectedEventId = null;
        this.logForm = {
          side: 'long',
          result: 'win',
          notes: ''
        };
        
        // Reload logs
        await this.loadLogs();
      } catch (error) {
        console.error('Error logging event:', error);
        this.$bvToast.toast('Failed to log event', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.loading = false;
      }
    },
    
    // Delete Log
    async deleteLog(id) {
      if (!confirm('Delete this log?')) return;
      
      try {
        this.loading = true;
        await pb.collection('logs').delete(id);
        
        this.$bvToast.toast('Log deleted', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 2000
        });
        
        await this.loadLogs();
      } catch (error) {
        console.error('Error deleting log:', error);
        this.$bvToast.toast('Failed to delete log', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      } finally {
        this.loading = false;
      }
    },
    
    // Helper: Get Event Name
    getEventName(eventId) {
      const event = this.events.find(e => e.id === eventId);
      return event ? event.name : 'Unknown';
    },
    
    // Helper: Get Event Type
    getEventType(eventId) {
      const event = this.events.find(e => e.id === eventId);
      return event ? event.type : '-';
    },
    
    // Helper: Get Event Data
    getEventData(eventId) {
      const event = this.events.find(e => e.id === eventId);
      return event ? event.data : '-';
    },
    
    // Format Timestamp
    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    
    // Export JSON
    exportJSON() {
      const exportData = {
        events: this.events,
        logs: this.logs
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-events-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    
    // Export CSV
    exportCSV() {
      const headers = ['Timestamp', 'Event', 'Type', 'Data', 'Side', 'Result', 'Notes'];
      const rows = [headers.join(',')];
      
      this.sortedLogs.forEach(log => {
        const row = [
          this.formatTimestamp(log.created),
          this.getEventName(log.event_id),
          this.getEventType(log.event_id),
          this.getEventData(log.event_id),
          log.side.toUpperCase(),
          log.result.toUpperCase(),
          log.notes || '-'
        ];
        
        // Escape commas and quotes
        const escapedRow = row.map(val => {
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        
        rows.push(escapedRow.join(','));
      });
      
      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-events-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  },
  
  async mounted() {
    // Load initial data
    await this.loadEvents();
    await this.loadLogs();
  }
});
