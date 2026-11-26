import test from "node:test";
import assert from "node:assert/strict";
import { trackerFromArchive, mergeTracker } from "../src/lib/model-record.mjs";

function fixture() {
  const row = { published_games: 3, graded_games: 2, pending_games: 1, winner_accuracy: .5, margin_mae: 10 };
  return [{ season: 2026, combined: row, by_week: { "week-12": row } }, {
    season: 2026, population_rows: 3, graded_rows: 2, pending_rows: 1,
    receipts: [{ season: 2026, week: 12, games: 3, publication_status: "final-public", receipt_version: 1, designated_at_utc: "2026-11-23T22:00:00Z" }],
  }];
}

test("public receipt totals map to existing display fields without changing history", () => {
  const tracker = trackerFromArchive(...fixture());
  const record = mergeTracker({ historical_evidence: { games: 7436 }, current_season: { specification_note: "preserved" } }, tracker);
  assert.equal(record.current_season.summary.games_graded, 2);
  assert.equal(record.current_season.weeks[0].week, 12);
  assert.equal(record.historical_evidence.games, 7436);
  assert.equal(record.current_season.specification_note, "preserved");
});

test("mixed archive versions fail closed", () => {
  const [summary, manifest] = fixture();
  manifest.graded_rows = 1;
  assert.throws(() => trackerFromArchive(summary, manifest), /population mismatch/);
});

test("duplicate/superseded receipts and inconsistent counts are rejected", () => {
  const [summary, manifest] = fixture();
  manifest.receipts.push(manifest.receipts[0]);
  assert.throws(() => trackerFromArchive(summary, manifest), /designated receipt/);
  manifest.receipts.pop();
  summary.combined = { ...summary.combined, published_games: 9 };
  assert.throws(() => trackerFromArchive(summary, manifest), /reconcile/);
});
