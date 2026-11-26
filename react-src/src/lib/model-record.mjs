const ARCHIVE = "https://raw.githubusercontent.com/Joshua-Pugh/cfp-advantage-validation/main/replication";
const DATA_URL = "/public-data/validation-record.json";

function requireCount(value) {
  if (!Number.isInteger(value) || value < 0) throw new Error("Invalid receipt count");
  return value;
}

export function trackerFromArchive(summary, manifest) {
  if (summary.season !== 2026 || manifest.season !== 2026 || !Array.isArray(manifest.receipts)) {
    throw new Error("Unexpected public receipt season");
  }
  function counts(row) {
    const result = {
      games_published: requireCount(row.published_games),
      games_graded: requireCount(row.graded_games),
      games_pending: requireCount(row.pending_games),
      winner_accuracy: row.winner_accuracy,
      margin_mae: row.margin_mae,
    };
    if (result.games_published !== result.games_graded + result.games_pending) throw new Error("Receipt counts do not reconcile");
    if (result.games_graded && (!Number.isFinite(row.winner_accuracy) || row.winner_accuracy < 0 || row.winner_accuracy > 1 || !Number.isFinite(row.margin_mae) || row.margin_mae < 0)) {
      throw new Error("Invalid graded metrics");
    }
    return result;
  }
  const combined = counts(summary.combined);
  const seen = new Set();
  const weeks = manifest.receipts.map((receipt) => {
    if (receipt.season !== 2026 || receipt.publication_status !== "final-public" || seen.has(receipt.week)) throw new Error("Invalid designated receipt");
    seen.add(receipt.week);
    const week = summary.by_week[`week-${String(receipt.week).padStart(2, "0")}`];
    if (!week || receipt.games !== week.published_games) throw new Error("Archive receipt/summary mismatch");
    return {
      week: receipt.week,
      published_at_utc: receipt.designated_at_utc,
      run_label: receipt.run_label,
      publication_status: receipt.publication_status,
      receipt_version: receipt.receipt_version,
      ...counts(week),
    };
  }).sort((a, b) => a.week - b.week);
  if (Object.keys(summary.by_week).length !== weeks.length) throw new Error("Missing weekly receipt");
  for (const field of ["games_published", "games_graded", "games_pending"]) {
    if (weeks.reduce((total, week) => total + week[field], 0) !== combined[field]) throw new Error("Weekly totals mismatch");
  }
  if (manifest.population_rows !== combined.games_published || manifest.graded_rows !== combined.games_graded || manifest.pending_rows !== combined.games_pending) {
    throw new Error("Archive population mismatch");
  }
  return {
    season: 2026,
    updated_at_utc: weeks.map((week) => week.published_at_utc).sort().at(-1),
    update_policy: "Updated after certified weekly receipts are published and graded; this is not a live scoreboard.",
    receipt_repository_url: "https://github.com/Joshua-Pugh/cfp-advantage-validation",
    source: "designated public receipt archive",
    summary: combined,
    weeks,
  };
}

async function json(fetcher, url) {
  const response = await fetcher(url, { cache: "no-cache", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Public record source failed: ${response.status}`);
  return response.json();
}

export async function fetchArchiveTracker(fetcher = fetch) {
  const [summary, manifest] = await Promise.all([
    json(fetcher, `${ARCHIVE}/summary.json`), json(fetcher, `${ARCHIVE}/manifest.json`),
  ]);
  return trackerFromArchive(summary, manifest);
}

export function mergeTracker(record, tracker) {
  return {
    ...record,
    current_season: {
      ...record.current_season,
      updated_at: tracker.updated_at_utc,
      update_policy: tracker.update_policy,
      summary: tracker.summary,
      weeks: tracker.weeks,
    },
    receipt_repository_url: tracker.receipt_repository_url || record.receipt_repository_url,
  };
}

let pending;
export function loadModelRecord() {
  pending ??= (async () => {
    const record = await json(fetch, DATA_URL);
    try {
      return mergeTracker(record, await fetchArchiveTracker());
    } catch (error) {
      console.warn("Public receipt archive unavailable; using published model-record snapshot.", error);
      return record;
    }
  })().catch((error) => { pending = undefined; throw error; });
  return pending;
}
