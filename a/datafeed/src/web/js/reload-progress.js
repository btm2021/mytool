// Reload progress tracking
export function createReloadProgressMixin() {
  return {
    data() {
      return {
        workerProgress: {},
        showTasksModal: false
      };
    },
    
    methods: {
      handleReloadProgress(data) {
        const exchange = data.exchange;
        
        if (data.status === 'completed' || data.status === 'error') {
          // Clear progress after completion
          setTimeout(() => {
            delete this.workerProgress[exchange];
            this.workerProgress = { ...this.workerProgress };
          }, 2000);
        } else {
          // Update progress
          this.workerProgress = {
            ...this.workerProgress,
            [exchange]: {
              status: data.status,
              message: data.message,
              progress: data.progress || 0
            }
          };
        }
      }
    }
  };
}
