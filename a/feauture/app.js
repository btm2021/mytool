// Initialize PocketBase
const pb = new PocketBase('https://btm2021.pockethost.io');

new Vue({
  el: '#app',
  data() {
    return {
      activeTab: 'log',
      loading: true,
      overlayMessage: 'Connecting to server...',
      connectionStatus: 'Connecting...',
      initialLoad: true,

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
      subEventIds: [],
      tempSubEventId: null,
      logForm: {
        side: 'long',
        result: 'win',
        notes: ''
      },

      // Log Detail Modal
      showLogDetailModal: false,
      selectedLog: null,
      additionalEventIds: [],
      tempEventId: null,

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
    showOverlay(message) {
      this.loading = true;
      this.overlayMessage = message;
    },

    showSuccess(message) {
      this.overlayMessage = message;
    },

    hideOverlay() {
      this.loading = false;
      this.overlayMessage = '';
    },

    addSubEvent() {
      if (!this.tempSubEventId || this.subEventIds.includes(this.tempSubEventId)) {
        return;
      }
      this.subEventIds.push(this.tempSubEventId);
      this.tempSubEventId = null;
    },

    removeSubEvent(eventId) {
      const index = this.subEventIds.indexOf(eventId);
      if (index > -1) {
        this.subEventIds.splice(index, 1);
      }
    },

    // Load Events
    async loadEvents() {
      try {
        if (!this.initialLoad) {
          this.showOverlay('Loading events...');
        }
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
        if (!this.initialLoad) {
          this.hideOverlay();
        }
      }
    },

    // Create Event
    async createEvent() {
      if (!this.eventForm.name) return;

      try {
        this.showOverlay('Creating event...');
        const data = {
          name: this.eventForm.name,
          type: this.eventForm.type || '',
          data: this.eventForm.data || '',
          comment: this.eventForm.comment || ''
        };

        const newEvent = await pb.collection('events').create(data);

        // Add new event to the beginning of the array
        this.events.unshift(newEvent);

        // Reset form
        this.eventForm = {
          name: '',
          type: '',
          data: '',
          comment: ''
        };

        this.hideOverlay();

        this.$bvToast.toast('Event created', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 1500
        });
      } catch (error) {
        console.error('Error creating event:', error);
        this.hideOverlay();
        this.$bvToast.toast('Failed to create event', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      }
    },

    // Delete Event
    async deleteEvent(id) {

      try {
        this.showOverlay('Deleting event...');
        await pb.collection('events').delete(id);

        // Remove event from array
        const index = this.events.findIndex(event => event.id === id);
        if (index > -1) {
          this.events.splice(index, 1);
        }

        this.hideOverlay();

        this.$bvToast.toast('Event deleted', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 1500
        });
      } catch (error) {
        console.error('Error deleting event:', error);
        this.hideOverlay();
        this.$bvToast.toast('Failed to delete event', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      }
    },

    // Load Logs
    async loadLogs() {
      try {
        if (!this.initialLoad) {
          this.showOverlay('Loading logs...');
        }
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
        if (!this.initialLoad) {
          this.hideOverlay();
        }
      }
    },

    // Log Event
    async logEvent() {
      if (!this.selectedEventId) return;

      try {
        this.showOverlay('Logging event...');
        const data = {
          event_id: this.selectedEventId,
          side: this.logForm.side,
          result: this.logForm.result,
          notes: this.logForm.notes || '',
          additional_events: this.subEventIds
        };

        const newLog = await pb.collection('logs').create(data);

        // Add new log to the beginning of the array
        this.logs.unshift(newLog);

        // Reset form
        this.selectedEventId = null;
        this.subEventIds = [];
        this.logForm = {
          side: 'long',
          result: 'win',
          notes: ''
        };

        this.hideOverlay();

        this.$bvToast.toast('Event logged', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 1500
        });
      } catch (error) {
        console.error('Error logging event:', error);
        this.hideOverlay();
        this.$bvToast.toast('Failed to log event', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      }
    },

    // Delete Log
    async deleteLog(id) {

      try {
        this.showOverlay('Deleting log...');
        await pb.collection('logs').delete(id);

        // Remove log from array
        const index = this.logs.findIndex(log => log.id === id);
        if (index > -1) {
          this.logs.splice(index, 1);
        }

        this.hideOverlay();

        this.$bvToast.toast('Log deleted', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 1500
        });
      } catch (error) {
        console.error('Error deleting log:', error);
        this.hideOverlay();
        this.$bvToast.toast('Failed to delete log', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
      }
    },

    // Open Log Detail Modal
    openLogDetail(log) {
      this.selectedLog = log;
      this.additionalEventIds = log.additional_events || [];
      this.showLogDetailModal = true;
    },

    // Add Additional Event
    addAdditionalEvent(eventId) {
      if (!eventId || this.additionalEventIds.includes(eventId)) return;
      this.additionalEventIds.push(eventId);
    },

    // Remove Additional Event
    removeAdditionalEvent(eventId) {
      const index = this.additionalEventIds.indexOf(eventId);
      if (index > -1) {
        this.additionalEventIds.splice(index, 1);
      }
    },

    // Save Additional Events
    async saveAdditionalEvents() {
      if (!this.selectedLog) return;

      try {
        this.showOverlay('Updating log...');
        const updatedLog = await pb.collection('logs').update(this.selectedLog.id, {
          additional_events: this.additionalEventIds
        });

        // Update log in array
        const index = this.logs.findIndex(log => log.id === this.selectedLog.id);
        if (index > -1) {
          this.logs.splice(index, 1, updatedLog);
        }

        this.showLogDetailModal = false;
        this.hideOverlay();

        this.$bvToast.toast('Additional events saved', {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 1500
        });
      } catch (error) {
        console.error('Error saving additional events:', error);
        this.hideOverlay();
        this.$bvToast.toast('Failed to save additional events', {
          title: 'Error',
          variant: 'danger',
          solid: true
        });
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
    // Load initial data with overlay
    try {
      this.overlayMessage = 'Loading data...';

      // Load events and logs in parallel
      await Promise.all([
        this.loadEvents(),
        this.loadLogs()
      ]);

      this.overlayMessage = '✓ Connected!';

      // Brief delay to show success
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Initial load error:', error);
    } finally {
      this.initialLoad = false;
      this.hideOverlay();
    }
  }
});
