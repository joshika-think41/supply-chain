import type { DashboardState } from "./types.js";

const snapshots: DashboardState[] = [];

export function saveSnapshot(state: DashboardState) {
  snapshots.push(state);
  if (snapshots.length > 50) snapshots.shift();
}
export function latestSnapshot(): DashboardState | undefined {
  return snapshots.at(-1);
}
export function snapshotCount() { return snapshots.length; }
