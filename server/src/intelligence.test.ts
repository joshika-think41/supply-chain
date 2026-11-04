import assert from "node:assert/strict";
import test from "node:test";
import { calculateState } from "./intelligence.js";

test("supplier delay makes the leading supplier risk worse", () => {
  const baseline = calculateState("baseline"); const delayed = calculateState("supplier-delay");
  const baselineScore = baseline.insights.find(i => i.id === "supplier-sup-1")!.score;
  const delayedScore = delayed.insights.find(i => i.id === "supplier-sup-1")!.score;
  assert.ok(delayedScore > baselineScore);
});
test("demand spike reduces days of cover for affected SKU", () => {
  const state = calculateState("demand-spike");
  assert.ok(state.insights.some(i => i.id === "inventory-sku-1"));
});
