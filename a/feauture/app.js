// Define dynamic features
const FEATURES = [
  { feature: 'VSR_15m_10_10', inputType: 'boolean' },
  { feature: 'VSR_15m_15_10', inputType: 'boolean' },
  { feature: 'Atr bot', inputType: 'boolean' }

];

new Vue({
  el: '#app',
  data() {
    return {
      FEATURES: FEATURES,
      sideOptions: [
        { text: 'Long', value: 'long' },
        { text: 'Short', value: 'short' }
      ],
      newEntry: this.createEmptyEntry(),
      entries: []
    };
  },
  computed: {
    sortedEntries() {
      return [...this.entries].sort((a, b) => b.timestamp - a.timestamp);
    }
  },
  methods: {
    createEmptyEntry() {
      const features = {};
      FEATURES.forEach(f => {
        if (f.inputType === 'boolean') {
          features[f.feature] = false;
        } else if (f.inputType === 'number') {
          features[f.feature] = null;
        } else {
          features[f.feature] = '';
        }
      });

      return {
        side: 'long',
        features: features
      };
    },

    saveEntry() {
      const entry = {
        id: Date.now(),
        timestamp: Date.now(),
        side: this.newEntry.side,
        features: { ...this.newEntry.features }
      };

      this.entries.push(entry);
      this.saveToLocalStorage();
      this.newEntry = this.createEmptyEntry();

      this.$bvToast.toast('Entry saved successfully', {
        title: 'Success',
        variant: 'success',
        solid: true,
        autoHideDelay: 2000
      });
    },

    deleteEntry(id) {
      if (confirm('Delete this entry?')) {
        this.entries = this.entries.filter(e => e.id !== id);
        this.saveToLocalStorage();
      }
    },

    clearAllEntries() {
      if (confirm('Clear all entries? This cannot be undone.')) {
        this.entries = [];
        this.saveToLocalStorage();
      }
    },

    saveToLocalStorage() {
      localStorage.setItem('tradingResearchEntries', JSON.stringify(this.entries));
    },

    loadFromLocalStorage() {
      const stored = localStorage.getItem('tradingResearchEntries');
      if (stored) {
        try {
          this.entries = JSON.parse(stored);
        } catch (e) {
          console.error('Error loading entries:', e);
          this.entries = [];
        }
      }
    },

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

    formatFeatureValue(value, inputType) {
      if (inputType === 'boolean') {
        return value ? 'YES' : 'NO';
      }
      if (value === null || value === undefined || value === '') {
        return '-';
      }
      return value;
    },

    exportJSON() {
      const dataStr = JSON.stringify(this.entries, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-research-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },

    exportCSV() {
      // Build CSV header
      const headers = ['Timestamp', 'Side'];
      FEATURES.forEach(f => headers.push(f.feature));

      // Build CSV rows
      const rows = [headers.join(',')];

      this.sortedEntries.forEach(entry => {
        const row = [
          this.formatTimestamp(entry.timestamp),
          entry.side.toUpperCase()
        ];

        FEATURES.forEach(f => {
          let value = entry.features[f.feature];
          if (f.inputType === 'boolean') {
            value = value ? 'YES' : 'NO';
          } else if (value === null || value === undefined || value === '') {
            value = '-';
          }
          // Escape commas and quotes in text fields
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          row.push(value);
        });

        rows.push(row.join(','));
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-research-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  },

  mounted() {
    this.loadFromLocalStorage();
  }
});
