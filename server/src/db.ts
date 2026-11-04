import Database from "better-sqlite3";
import type { DashboardState } from "./types.js";

const db = new Database("supply-chain.db");
db.exec("CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, scenario TEXT NOT NULL, payload TEXT NOT NULL)");

export function saveSnapshot(state: DashboardState) {
  db.prepare("INSERT INTO snapshots (created_at, scenario, payload) VALUES (?, ?, ?)").run(state.generatedAt, state.scenario, JSON.stringify(state));
}
export function latestSnapshot(): DashboardState | undefined {
  const row = db.prepare("SELECT payload FROM snapshots ORDER BY id DESC LIMIT 1").get() as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : undefined;
}
export function snapshotCount() { return (db.prepare("SELECT COUNT(*) as count FROM snapshots").get() as { count: number }).count; }
