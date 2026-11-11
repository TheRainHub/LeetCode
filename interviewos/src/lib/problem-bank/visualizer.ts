/** Same key rule as algorithm-visualizer's server (utils/hierarchy.ts → createKey). */
export function visualizerKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w -]/g, "")
    .replace(/ /g, "-");
}

export function visualizerUrl(category: string, algorithm: string): string {
  return `https://algorithm-visualizer.org/${visualizerKey(category)}/${visualizerKey(algorithm)}`;
}

export function visualizerSourceUrl(category: string, algorithm: string): string {
  return `https://github.com/algorithm-visualizer/algorithms/tree/master/${encodeURIComponent(category)}/${encodeURIComponent(algorithm)}`;
}
