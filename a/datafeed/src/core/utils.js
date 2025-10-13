export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatTimestamp(ts) {
  return new Date(ts).toISOString();
}

export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
