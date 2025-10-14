// Main application entry point
import { formatBytes, formatUptime, isWorkerAlive } from './utils.js';
import { createWebSocketMixin } from './websocket.js';
import { createSystemMixin } from './system.js';
import { createLogsMixin } from './logs.js';
import { createCommandMixin } from './command.js';
import { createSymbolsMixin } from './symbols.js';
import { createRealtimeMixin } from './realtime.js';
import { createConfigMixin } from './config.js';
import { createSymbolsManagerMixin } from './symbols-manager.js';
import { createAppActionsMixin } from './app-actions.js';
import { createReloadProgressMixin } from './reload-progress.js';

// Wait for Vue to be available
if (typeof Vue === 'undefined') {
  throw new Error('Vue is not loaded. Make sure vue.global.prod.js is loaded before app.js');
}

const { createApp } = Vue;

// Merge all mixins
function mergeMixins(...mixins) {
  const merged = {
    data() {
      const data = {};
      mixins.forEach(mixin => {
        if (mixin.data) {
          Object.assign(data, mixin.data.call(this));
        }
      });
      return data;
    },
    computed: {},
    methods: {},
    watch: {}
  };
  
  mixins.forEach(mixin => {
    if (mixin.computed) Object.assign(merged.computed, mixin.computed);
    if (mixin.methods) Object.assign(merged.methods, mixin.methods);
    if (mixin.watch) Object.assign(merged.watch, mixin.watch);
  });
  
  return merged;
}

// Create app with all mixins
const appConfig = mergeMixins(
  createWebSocketMixin(),
  createSystemMixin(),
  createLogsMixin(),
  createCommandMixin(),
  createSymbolsMixin(),
  createRealtimeMixin(),
  createConfigMixin(),
  createSymbolsManagerMixin(),
  createAppActionsMixin(),
  createReloadProgressMixin()
);

// Add utility methods to app
appConfig.methods.formatBytes = formatBytes;
appConfig.methods.formatUptime = formatUptime;
appConfig.methods.isWorkerAlive = isWorkerAlive;

// Add lifecycle hooks
appConfig.mounted = function() {
  this.connect();
  this.loadDatabaseSymbols();
};

// Create and mount app
createApp(appConfig).mount('#app');
