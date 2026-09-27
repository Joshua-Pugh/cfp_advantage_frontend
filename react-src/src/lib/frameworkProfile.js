export const FRAMEWORK_TRAITS = [
  { key: "control_creation_percentile", label: "Create Control", formalLabel: "Control Creation", valueKey: "control_creation_rate", tierKey: "control_creation_tier", format: "percent" },
  { key: "control_denial_percentile", label: "Deny Control", formalLabel: "Control Denial", valueKey: "control_denial_rate", tierKey: "control_denial_tier", format: "percent" },
  { key: "control_finish_percentile", label: "Finish Control", formalLabel: "Finishing Control", valueKey: "control_finish_rate", tierKey: "control_finish_tier", format: "percent" },
  { key: "finishing_resistance_percentile", label: "Resist Opponent Finish", formalLabel: "Finishing Resistance", valueKey: "finishing_resistance_rate", tierKey: "finishing_resistance_tier", format: "percent" },
  { key: "control_production_percentile", label: "Create Scoring Pressure", formalLabel: "Scoring Pressure", valueKey: "control_production_rate", tierKey: "control_production_tier", format: "decimal" },
  { key: "defensive_control_production_allowed_percentile", label: "Suppress Scoring Pressure", formalLabel: "Pressure Suppression", valueKey: "defensive_control_production_allowed", tierKey: "defensive_control_production_allowed_tier", format: "decimal" },
];

export function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decimal(value, digits = 1) {
  const parsed = numberOrNull(value);
  return parsed === null ? "-" : parsed.toFixed(digits);
}

export function percent(value, digits = 1) {
  const parsed = numberOrNull(value);
  if (parsed === null) return "-";
  const normalized = Math.abs(parsed) <= 1.5 ? parsed * 100 : parsed;
  return `${normalized.toFixed(digits)}%`;
}

export function percentile(value) {
  const parsed = numberOrNull(value);
  if (parsed === null) return "Not graded";
  const rounded = Math.round(parsed);
  const finalTwo = rounded % 100;
  const suffix = finalTwo >= 11 && finalTwo <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[rounded % 10] || "th");
  return `${rounded}${suffix} percentile`;
}

export function signedDecimal(value, digits = 1) {
  const parsed = numberOrNull(value);
  if (parsed === null) return "-";
  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(digits)}`;
}

export function contextualValues(intel = {}, driveConversion = {}) {
  let nested = intel.contextual_profile_json;
  if (typeof nested === "string" && nested.trim()) {
    try {
      nested = JSON.parse(nested);
    } catch {
      nested = {};
    }
  }

  const view = {
    ...intel,
    ...(nested && typeof nested === "object" && !Array.isArray(nested) ? nested : {}),
  };

  if (numberOrNull(view.points_per_control_drive) === null) {
    view.points_per_control_drive = driveConversion.points_per_control_drive;
  }
  if (numberOrNull(view.offensive_drives) === null) {
    view.offensive_drives = driveConversion.drives;
  }
  if (
    numberOrNull(view.control_production_rate) === null &&
    numberOrNull(view.control_creation_rate) !== null &&
    numberOrNull(view.points_per_control_drive) !== null
  ) {
    view.control_production_rate = Number(view.control_creation_rate) * Number(view.points_per_control_drive);
  }
  return view;
}

function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;
  return fallback;
}

function relativeLuminance(hex) {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const value = Number.parseInt(clean.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableTeamColor(primary, secondary) {
  const darkSurface = "#17251f";
  const lightSurface = "#ffffff";
  const candidates = [secondary, primary];
  const bestAgainstDark = [...candidates].sort(
    (first, second) => contrastRatio(second, darkSurface) - contrastRatio(first, darkSurface),
  )[0];
  const bestAgainstLight = [...candidates].sort(
    (first, second) => contrastRatio(second, lightSurface) - contrastRatio(first, lightSurface),
  )[0];

  return {
    dark: contrastRatio(bestAgainstDark, darkSurface) >= 3 ? bestAgainstDark : "#efc967",
    light: contrastRatio(bestAgainstLight, lightSurface) >= 3 ? bestAgainstLight : "#174f3d",
  };
}

function colorChannels(hex) {
  const clean = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16));
}

function mixHex(first, second, firstWeight) {
  const firstChannels = colorChannels(first);
  const secondChannels = colorChannels(second);
  const weight = Math.max(0, Math.min(1, firstWeight));
  const mixed = firstChannels.map((channel, index) => (
    Math.round((channel * weight) + (secondChannels[index] * (1 - weight)))
  ));
  return `rgb(${mixed.join(", ")})`;
}

function alphaHex(hex, alpha) {
  return `rgba(${colorChannels(hex).join(", ")}, ${alpha})`;
}

export function teamPalette(identity = {}) {
  const primary = normalizeColor(identity.color, "#174f3d");
  const secondary = normalizeColor(identity.alternate_color, "#d6ad55");
  const readable = readableTeamColor(primary, secondary);

  return {
    "--cfp-team-primary": primary,
    "--cfp-team-secondary": secondary,
    "--cfp-team-accent": readable.dark,
    "--cfp-team-ink": readable.light,
  };
}

export function frameworkCardPalette(identity = {}) {
  const palette = teamPalette(identity);
  const primary = palette["--cfp-team-primary"];
  const secondary = palette["--cfp-team-secondary"];
  const surface = "#171b1f";
  const surfaceSubtle = "#20262a";
  const line = "rgba(247, 247, 242, 0.18)";

  return {
    ...palette,
    "--cfp-surface": surface,
    "--cfp-surface-subtle": surfaceSubtle,
    "--cfp-text": "#f7f7f2",
    "--cfp-muted": "#f7f7f2",
    "--cfp-line": line,
    "--cfp-card-text": "#f7f7f2",
    "--cfp-export-border": mixHex(primary, "#f7f7f2", 0.62),
    "--cfp-export-shadow": alphaHex(primary, 0.24),
    "--cfp-export-header-start": mixHex(primary, "#101820", 0.36),
    "--cfp-export-header-end": mixHex(primary, "#101820", 0.22),
    "--cfp-export-secondary-light": "#f7f7f2",
    "--cfp-export-trait-fill": mixHex(primary, "#ffffff", 0.68),
    "--cfp-export-heading-line": mixHex(secondary, "#f7f7f2", 0.55),
    "--cfp-export-heading-bg": surfaceSubtle,
    "--cfp-export-section-chip": mixHex(primary, "#101820", 0.34),
    "--cfp-export-track": "rgba(247, 247, 242, 0.18)",
    "--cfp-export-signature": mixHex(primary, "#101820", 0.22),
  };
}

export function buildFrameworkTraits(view, reference = {}) {
  return FRAMEWORK_TRAITS.map((definition) => {
    const benchmark = reference.traits?.[definition.key] || {};
    const value = definition.format === "percent"
      ? percent(view[definition.valueKey])
      : decimal(view[definition.valueKey], 2);
    return {
      ...definition,
      percentile: numberOrNull(view[definition.key]),
      floor: numberOrNull(benchmark.floor_p20),
      median: numberOrNull(benchmark.median),
      raw: value,
      tier: view[definition.tierKey] || "Not graded",
      translation: reference.translations?.[definition.key] || "Relationship context is not available for this profile.",
    };
  }).filter((trait) => trait.percentile !== null);
}

export function profileDiagnosis(strongest, limiting) {
  if (!strongest || !limiting) {
    return "A possession-level view of how this team creates, converts, and denies meaningful control.";
  }
  return `${strongest.formalLabel} defines the profile. ${limiting.formalLabel} is the clearest constraint.`;
}

export function scoreboardGapRead(value) {
  const gap = numberOrNull(value);
  if (gap === null) return "Scoreboard Control Gap is unavailable for this team-season.";
  if (Math.abs(gap) < 1) return "The scoreboard has closely matched the team's underlying ADV control profile.";
  if (gap > 0) return `The team's average scoring margin has run ${gap.toFixed(2)} points ahead of its underlying ADV control profile.`;
  return `The team's underlying ADV control profile has run ${Math.abs(gap).toFixed(2)} points stronger than its average scoring margin.`;
}
