# Codex Task — CFP Advantage v3.24: Intelligence Layer Prototype Test Harness

We are continuing CFP Advantage Model development.

## User / credit constraint

The user is working under Codex rate limits and has limited credits. This pass must be efficient.

Rules:
- Use local repaired artifacts only.
- Do not call CFBD, Odds API, Gemini, or external APIs.
- Do not reload Neon.
- Do not modify frontend/API/database/scoring engine.
- Do not change Product A displayed margin.
- Do not expose formulas publicly.
- Do not use deprecated `data/outputs/v3/v3_game_metrics.csv` as scoring truth.
- Build a test harness and research outputs only.
- If a required input is missing, mark the section skipped/timing-gated rather than inventing data.

---

## Current repaired baseline

The repaired retained Product A core is trusted.

Confirmed:
- 11,971 repaired retained-core games.
- Product A integrity assertions pass with zero identity, scoreboard, finite-value, ADV symmetry, OFF/DEF/SP recomposition, schedule-perspective, or field-position failures.
- Fixed ADV margin scale remains valid with warnings:
  - postgame repaired core fitted no-intercept multiplier: 0.308649
  - fixed-scale MAE: 5.4110
  - fixed-scale R2: 0.901269
  - non-OT fitted multiplier: 0.309488
  - OT fitted multiplier: 0.045656
- Pregame expected-margin validation:
  - 9,679 prior-safe graded games
  - MAE 14.8560
  - RMSE 18.70
  - winner accuracy 66.76%
- Team-season pre-playoff translation:
  - R2 0.960515
  - MAE 1.8287

Post-repair private research status:
- Dynamic/context margin research showed private improvement:
  - fixed baseline universe MAE 14.7593, winner 66.90%
  - best private variant `training_combined_plus_bias` MAE 14.4219, winner 67.69%
  - held-out 2023–2025 baseline MAE 14.5238 vs best MAE 14.1527
  - held-out winner accuracy 67.95% -> 68.80%
- Raw ATS board after repair:
  - Open ADV edge 5+: 1,547 picks, 53.13%, +21.64 units, avg CLV +1.00
  - Close ADV edge 5+: 1,485 picks, 49.38%, -83.08 units
- Repaired rolling CR rebuilt from retained-core scorer traces:
  - 11,971 repaired games rescored
  - 23,942 team-game CR rows built
  - 0 scoring failures
  - 0 deprecated v3_game_metrics.csv rows read
- Repaired CR dog lane:
  - Open ADV edge 5+ dogs: 715 plays, 383-315-17, 54.87%, +33.19 units, +1.15 avg CLV
  - CR-protected dogs, CR gap > +0.01: 254 plays, 150-97-7, 60.73%, +39.37 units, +1.94 avg CLV
- Open edge 5+ favorites:
  - 817 plays, 416-390-11, 51.61%, -11.81 units
- Compounding favorite penalty:
  - held-out selected formulas produced 856 plays, +44.82 units, improving baseline by +12.45 units
  - promising private research only because 68 formulas were screened
- Removed-favorite dog flip:
  - 85 games, 47-38, +4.73 units
  - positive but too small/fragile for a flip rule
- Timestamp persistence:
  - existing local odds archive only
  - CR-protected candidate games mapped: 75
  - still edge 5+ at first sampled market point: 65
  - crossed below edge 5: 6
  - crossed below edge 3: 3
  - median observed window: 66 hours
  - median crossing below edge 5: 30 hours
  - supports value-persistence research but does not establish execution window because first sampled point is not verified true opener

---

## Purpose of this pass

Build a local research-only test harness for the proposed Intelligence Layer formulas.

This is the proposed sequence to test:

1. Preseason Anchor Blending Formula, Weeks 1–4.
2. Rolling Checkpoint Velocity / Slope.
3. Matchup Velocity Adjustment.
4. Talent-Yield Index.
5. Variance Stabilization Damping.
6. Combined Context-Adjusted Projection.

Important:
These formulas are candidate research formulas, not production formulas.
The raw ADV expected margin remains the official Product A baseline until a context-adjusted version beats it in walk-forward tests and remains explainable.

---

# Part 1 — Create Intelligence Layer Test Harness

Create:

- `scripts/test_intelligence_layer_projection_stack.py`

Outputs:

- `data/outputs/audits/intelligence_layer/intelligence_layer_projection_summary.md`
- `data/outputs/audits/intelligence_layer/intelligence_layer_projection_report.json`
- `data/outputs/audits/intelligence_layer/intelligence_layer_projection_grid.csv`
- `data/outputs/audits/intelligence_layer/intelligence_layer_projection_examples.csv`
- `data/outputs/audits/intelligence_layer/intelligence_layer_component_audit.csv`
- `data/outputs/audits/intelligence_layer/intelligence_layer_feature_availability.md`
- `data/outputs/audits/intelligence_layer/intelligence_layer_feature_availability.json`
- `data/outputs/audits/intelligence_layer/intelligence_layer_truth_status.md`
- `data/outputs/audits/intelligence_layer/intelligence_layer_truth_status.json`

The harness must:
- use repaired/pregame-safe rows only
- preserve raw ADV margin as baseline
- generate candidate adjusted margins beside raw margin
- evaluate each candidate with walk-forward logic
- avoid target-game/postgame leakage
- mark missing inputs as unavailable/timing-gated
- produce a clear comparison table versus raw 0.30 baseline

---

# Part 2 — Baseline Control

Always include:

```text
raw_margin = adv_gap * 0.30
```

Evaluate:
- all seasons
- held-out 2023–2025
- by season
- by week bucket
- by matchup type
- by tier
- by expected margin bucket
- by favorite/dog if opener lines exist

Metrics:
- rows
- MAE
- RMSE
- bias
- winner accuracy
- 14+ miss rate
- 21+ miss rate
- upset miss rate if available
- ATS units only in private ATS overlays
- avg CLV if available

This raw baseline is the benchmark. No candidate can be promoted unless it beats this benchmark in walk-forward testing without worsening stability.

---

# Part 3 — Preseason Anchor Blending Formula, Weeks 1–4

Goal:
Stabilize early-season projections before enough current-season live ADV sample exists.

Candidate formula:

```text
anchor_live_blend = (anchor_value * W_A) + (live_adv_value * W_L)
W_A + W_L = 1.0
```

Test only if inputs are available locally and timing-safe.

Candidate anchor inputs:
- prior-season ADV SRS
- prior-season OFF ADV SRS
- prior-season DEF ADV SRS
- prior-season SOS
- prior-season record
- CFBD talent composite if as-of timing is documented or explicitly marked timing-gated
- AP/Coaches Week-1 regular poll only if publication timing is documented or explicitly marked timing-gated

Important:
- Do not use CFP rankings as preseason input.
- Do not use postseason poll boards as preseason input.
- Do not use season-end data from the target season.
- If talent/polls lack timing proof, run a lagged-only anchor first and mark talent/polls as timing-gated.

Candidate weights:
- Week 1: 0.80 anchor / 0.20 live
- Week 2: 0.65 anchor / 0.35 live
- Week 3: 0.50 anchor / 0.50 live
- Week 4: 0.35 anchor / 0.65 live
- Week 5+: 0.00 anchor / 1.00 live

Also grid-test:
- slower decay
- faster decay
- hard cutoff at Week 5
- hard cutoff at Week 6
- lagged-only anchor
- talent/ranking-enriched anchor only if timing-safe

Evaluate:
- Weeks 1–4 only
- Weeks 1–6 transition only
- all season, for context
- margin MAE/RMSE
- winner accuracy
- ATS opener edge if available
- whether anchor improves early-season performance over raw live ADV
- whether anchor hurts once live sample stabilizes

Output:
- anchor candidate status:
  - blocked_timing_gated
  - lagged_only_promising
  - talent_poll_candidate_pending_timing
  - rejected
  - insufficient_data

---

# Part 4 — Rolling Checkpoint Velocity / Slope

Goal:
Measure direction without altering raw ADV SRS.

Use prior games only.

Candidate slope definitions:

## A. Rolling-game slope
- rolling 3-game ADV average
- rolling 4-game ADV average
- rolling 5-game ADV average
- compare recent rolling average vs previous rolling average
- use OFF, DEF, and total ADV if available

## B. Block checkpoint slope
- Weeks 1–4 block
- Weeks 5–8 block
- Weeks 9–12 block
- postseason/conference championship block if available but mark separately
- current block average minus prior block average

Candidate classifications:
- upward
- stable
- downward
- chaotic
- insufficient_sample

Do not hardcode thresholds like `m > 0.5` as truth. Test threshold grid:
- 0.25
- 0.50
- 0.75
- 1.00

Volatility:
- rolling standard deviation
- coefficient of variation if meaningful
- recent-vs-season delta
- boom/bust label

Outputs:
- `data/outputs/audits/intelligence_layer/velocity_slope_profiles.csv`
- `data/outputs/audits/intelligence_layer/velocity_slope_summary.md`
- `data/outputs/audits/intelligence_layer/velocity_slope_report.json`

Evaluate:
- does upward/stable/downward predict winner accuracy?
- does it reduce margin MAE?
- do ascender dogs perform better ATS?
- do descender favorites underperform?
- does chaos imply wider margin miss rates?

---

# Part 5 — Matchup Velocity Adjustment

Research-only.

Avoid large multiplicative adjustments first. Test additive nudges before multipliers.

Candidate additive nudges:
- upward vs stable: +0.5, +1.0, +1.5 points
- upward vs downward: +1.0, +1.5, +2.0, +2.5 points
- stable vs downward: +0.5, +1.0 points
- downward favorite penalty: -0.5, -1.0, -1.5, -2.0 points
- chaos penalty: shrink toward zero by 0.5, 1.0, 1.5, 2.0 points

Candidate multiplicative weights only as secondary test:
- upward: 1.05, 1.10, 1.15
- stable: 1.00
- downward: 0.95, 0.90, 0.85

Safety:
- cap total velocity adjustment:
  - ±1.5
  - ±2.0
  - ±3.0
  - ±3.5

Evaluate:
- margin MAE/RMSE/bias
- winner accuracy
- 14+/21+ miss rates
- ATS overlay if local opener lines exist
- held-out 2023–2025
- season-by-season stability

---

# Part 6 — Talent-Yield Index

Goal:
Measure how efficiently a team converts roster/talent expectation into ADV performance.

Use only timing-safe local talent inputs.

If talent data exists but timing is not proven:
- build the data table
- mark TYI as timing-gated
- do not use TYI as pregame adjustment
- allow descriptive historical analysis only

Candidate formula:

```text
TYI = ADV_z - Talent_z
```

Also test percentile/rank version:

```text
TYI_percentile = ADV_percentile - Talent_percentile
```

Candidate labels:
- high_talent_high_adv
- high_talent_low_adv
- low_talent_high_adv
- low_talent_low_adv
- talent_underperformance
- system_overperformance
- timing_gated
- insufficient_data

Use TYI first as a label. Only test small nudges if timing-safe.

Candidate TYI nudges:
- system overperformance + positive velocity: +0.5 to +1.5
- talent underperformance + negative velocity: -0.5 to -1.5
- high talent / high ADV / stable: no nudge, confidence label
- high talent / low ADV / chaos: variance warning, not automatic penalty

Outputs:
- `data/outputs/audits/intelligence_layer/tyi_summary.md`
- `data/outputs/audits/intelligence_layer/tyi_report.json`
- `data/outputs/audits/intelligence_layer/tyi_team_seasons.csv`
- `data/outputs/audits/intelligence_layer/tyi_examples.csv`

Evaluate:
- correlation between talent and ADV
- talent vs final ADV SRS
- talent vs OFF/DEF ADV
- TYI stability year-over-year if available
- whether TYI helps early-season margin/winner accuracy
- whether TYI helps classify favorites/underdogs
- whether TYI adds value beyond raw ADV

---

# Part 7 — Variance Stabilization Damping

Goal:
Reduce overconfident margins in historically volatile matchups without rewriting raw ADV.

Candidate formula:

```text
adjusted_margin = raw_margin * (1 - K)
```

K is training-selected, not hand-picked.

K grid:
- 0.00
- 0.02
- 0.05
- 0.10
- 0.15
- 0.20
- 0.25
- 0.30

Candidate contexts:
- G5/G5
- P4/G5
- P4/P4
- FBS/FCS
- high rolling volatility
- chaotic trajectory bucket
- large favorite
- weak edge
- late-season noisy rows
- expected margin 21+
- favorite with high margin variance
- dog with CR support, if available

Important:
- Do not shrink based on target-game outcomes.
- Do not use actual overtime/SP event in target game as pregame input.
- Postgame segments can be diagnostics only.

Evaluate:
- MAE/RMSE/bias
- winner accuracy
- 14+/21+ miss rates
- ATS overlay
- held-out 2023–2025
- whether damping helps exact margin while preserving winner accuracy

Outputs:
- `data/outputs/audits/intelligence_layer/variance_damping_summary.md`
- `data/outputs/audits/intelligence_layer/variance_damping_report.json`
- `data/outputs/audits/intelligence_layer/variance_damping_grid.csv`

---

# Part 8 — Combined Context-Adjusted Projection Stack

Build research candidates only.

Candidate formula:

```text
raw_margin = adv_gap * 0.30
context_adjustment = velocity_nudge + TYI_nudge - variance_damping_points
adjusted_margin = raw_margin + clamp(context_adjustment, -cap, +cap)
```

Test caps:
- ±1.5
- ±2.0
- ±3.0
- ±3.5
- ±4.0

Also test bounded dynamic scale:

```text
dynamic_multiplier = clamp(0.30 + context_delta, lower_bound, upper_bound)
adjusted_margin = adv_gap * dynamic_multiplier
```

Bounds:
- 0.285 / 0.325
- 0.290 / 0.320
- 0.280 / 0.330

Compare:
- raw 0.30 baseline
- anchor-only
- velocity-only
- TYI-label-only
- variance-only
- velocity + variance
- anchor + velocity
- anchor + TYI
- all available context stack
- dynamic multiplier version
- additive capped version

Evaluate:
- all seasons
- held-out 2023–2025
- early season
- late season
- P4/P4
- G5/G5
- large favorites
- underdogs
- ATS openers if available
- CR dog lane if available

Promotion rules:
- Must beat raw 0.30 in walk-forward MAE or winner accuracy without worsening the other materially.
- Must be stable across seasons.
- Must not rely on postgame/future data.
- Must be explainable.
- If improvement is small, mark as `promising_private`, not production.

---

# Part 9 — Private ATS Overlay

Because this intelligence layer may help ATS, include private overlays only.

Test:
- raw open ADV edge 5+
- CR-protected opener dogs
- open edge 5+ favorites
- favorite fragility
- compounding favorite penalty
- removed favorite dog flip
- trajectory-enhanced CR dogs
- variance-damped favorite edges

Outputs:
- `data/outputs/audits/intelligence_layer/intelligence_layer_ats_overlay_summary.md`
- `data/outputs/audits/intelligence_layer/intelligence_layer_ats_overlay_report.json`
- `data/outputs/audits/intelligence_layer/intelligence_layer_ats_overlay_segments.csv`

Do not create public picks.
Do not modify Product B doctrine unless results are strong and walk-forward stable.

---

# Part 10 — Final Classification

Create final status table:

- `data/outputs/audits/intelligence_layer/intelligence_layer_final_truth_table.md`
- `data/outputs/audits/intelligence_layer/intelligence_layer_final_truth_table.json`
- `data/outputs/audits/intelligence_layer/intelligence_layer_final_truth_table.csv`

For each component:
- Preseason Anchor
- Velocity/Slope
- Matchup Velocity Adjustment
- TYI
- Variance Damping
- Combined Additive Stack
- Dynamic Multiplier Stack
- ATS Overlay

Classify:
- rejected
- insufficient_data
- timing_gated
- research_only
- promising_private
- product_a_context_candidate
- product_b_private_candidate

Include:
- best result
- baseline result
- improvement
- risk
- leakage status
- next step

---

# Part 11 — Validation

Run:

```powershell
python -m py_compile scripts/test_intelligence_layer_projection_stack.py
python scripts/test_intelligence_layer_projection_stack.py
python scripts/run_model_integrity_assertions.py
```

If helper scripts are created, compile them too.

Verify:
- no scoring-engine files changed
- no ADV SRS logic changed
- no frontend/API behavior changed
- no production schema changed
- no public wording changed
- no secrets written
- no external API calls
- deprecated `v3_game_metrics.csv` not used
- repaired Product A assertions still pass
- outputs are additive

---

# Final Response Required From Codex

Provide a concise report with:

1. Files created/modified.
2. Inputs used and skipped.
3. Whether Preseason Anchor was testable or timing-gated.
4. Best anchor result, if testable.
5. Velocity/slope result.
6. TYI result and whether talent timing is safe.
7. Variance damping result.
8. Best additive context-adjusted projection result.
9. Best bounded dynamic multiplier result.
10. Whether any context-adjusted projection beats raw 0.30 walk-forward.
11. Whether improvement holds on 2023–2025.
12. Whether the layer helps margin MAE, winner accuracy, or both.
13. Whether the layer helps ATS privately.
14. Which components are rejected/timing-gated/promising.
15. Validation commands run.
16. Whether this is ready for Product A, private research only, or needs more work.
