/**
 * ARCH Model — change risk.
 *
 * "Which of today's changes is most likely to page us tonight?"
 *
 * A Naive Bayes classifier over *categorical* features of a change (type, the predicted failure
 * category of the service it touched, time-of-day bucket, whether the message mentions a revert or
 * a migration, how many files it moved, whether the author is a bot). Labels come from history the
 * organization already has: a change is a positive example when an incident on the same service
 * opened within `windowMinutes` of it.
 *
 * Deliberately simple and explainable: every prediction comes back with the features that pushed
 * it up, so a responder can argue with it. It is a *ranking aid* for humans, never an auto-rollback
 * trigger (see docs/engineering/AI-GUARDRAILS.md).
 */

import type { CategoryId } from './knowledge';
import { tokenize } from './text';

export type ChangeFeatures = {
  /** DEPLOYMENT | CONFIG_CHANGE | ROLLBACK | MANUAL | … (free-form, lowercased). */
  type: string;
  serviceName: string | null;
  /** Failure category the ARCH model predicts for this service, when known. */
  serviceCategory: CategoryId | null;
  author: string | null;
  occurredAt: Date;
  filesChanged: number | null;
  commitMessage: string;
};

export type ChangeRiskModel = {
  /** Total labelled examples the model was trained on. */
  examples: number;
  /** Positives (changes that were followed by an incident). */
  incidents: number;
  /** log P(incident) / log P(no incident) before any feature. */
  logPriors: [number, number];
  /** feature name → [log P(feature|no incident), log P(feature|incident)]. */
  features: Record<string, [number, number]>;
  /** Feature names seen in training, for Laplace smoothing. */
  vocabularySize: number;
  trainedAt: string;
};

export type RiskBand = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH';

export type RiskPrediction = {
  /** P(an incident follows this change) on the same service, calibrated by smoothing. */
  probability: number;
  band: RiskBand;
  /** Features that moved the prediction, strongest first. */
  drivers: { feature: string; value: string; lift: number }[];
  /** True when the model had no history to learn from. */
  fallback: boolean;
};

export const CHANGE_RISK_WINDOW_MINUTES = 60;

const HOUR_BUCKETS: [number, string][] = [
  [6, 'night'],
  [10, 'morning'],
  [14, 'midday'],
  [18, 'afternoon'],
  [23, 'evening'],
];

function hourBucket(date: Date): string {
  const hour = date.getUTCHours();
  for (const [until, label] of HOUR_BUCKETS) if (hour < until) return label;
  return 'night';
}

function filesBucket(files: number | null): string {
  if (files === null) return 'unknown';
  if (files <= 3) return 'tiny';
  if (files <= 20) return 'small';
  if (files <= 100) return 'medium';
  return 'large';
}

const MESSAGE_FLAGS: [RegExp, string][] = [
  [/\brevert|roll\s?back\b/i, 'revert'],
  [/\bmigrat(e|ion|ed)\b/i, 'migration'],
  [/\bhotfix|patch\b/i, 'hotfix'],
  [/\bconfig\b/i, 'config'],
  [/\bupgrade|bump\b/i, 'upgrade'],
  [/\bfeat(ure)?\b/i, 'feature'],
  [/\bfix\b/i, 'fix'],
];

/** Turn a change into the categorical features the classifier understands. */
export function changeFeatures(change: ChangeFeatures): Record<string, string> {
  const features: Record<string, string> = {
    type: (change.type || 'unknown').toLowerCase(),
    hourBucket: hourBucket(change.occurredAt),
    weekday: change.occurredAt.getUTCDay() >= 5 ? 'weekend' : 'weekday',
    filesBucket: filesBucket(change.filesChanged),
    authorKind: isBotAuthor(change.author) ? 'bot' : 'human',
    service: change.serviceName ? change.serviceName.toLowerCase().slice(0, 60) : 'none',
  };
  if (change.serviceCategory) features.category = change.serviceCategory;
  for (const [pattern, flag] of MESSAGE_FLAGS) {
    if (pattern.test(change.commitMessage)) features[`msg:${flag}`] = 'yes';
  }
  // A change with no category and no service is weak evidence; keep the feature set honest.
  if (!change.serviceName) delete features.service;
  return features;
}

function isBotAuthor(author: string | null): boolean {
  if (!author) return false;
  return /\[bot\]|^bot[-_/]|^(dependabot|renovate|github-actions|ci|cd|deployer|terraform)$/i.test(author.trim());
}

export type ChangeRiskExample = { features: Record<string, string>; incident: boolean; weight?: number };

const ALPHA = 1;

export function trainChangeRisk(examples: ChangeRiskExample[], options: { now?: Date } = {}): ChangeRiskModel {
  const counts: Record<string, [number, number]> = {};
  let negatives = 0;
  let positives = 0;

  for (const example of examples) {
    const weight = example.weight ?? 1;
    if (example.incident) positives += weight;
    else negatives += weight;
    for (const [name, value] of Object.entries(example.features)) {
      const key = `${name}=${value}`;
      const row = (counts[key] ??= [0, 0]);
      if (example.incident) row[1] += weight;
      else row[0] += weight;
    }
  }

  const total = positives + negatives;
  const logPriors: [number, number] = [
    Math.log((negatives + ALPHA) / (total + 2 * ALPHA)),
    Math.log((positives + ALPHA) / (total + 2 * ALPHA)),
  ];

  const features: Record<string, [number, number]> = {};
  for (const [key, row] of Object.entries(counts)) {
    features[key] = [
      Math.log((row[0] + ALPHA) / (negatives + ALPHA * (Object.keys(counts).length + 1))),
      Math.log((row[1] + ALPHA) / (positives + ALPHA * (Object.keys(counts).length + 1))),
    ];
  }

  return {
    examples: examples.length,
    incidents: Math.round(positives),
    logPriors,
    features,
    vocabularySize: Object.keys(counts).length,
    trainedAt: (options.now ?? new Date()).toISOString(),
  };
}

const BANDS: [number, RiskBand][] = [
  [0.66, 'HIGH'],
  [0.4, 'ELEVATED'],
  [0.2, 'GUARDED'],
  [-Infinity, 'LOW'],
];

/**
 * Score one change. With no history the model says so (`fallback`) instead of inventing a number:
 * a workspace with a handful of changes has nothing to learn from yet.
 */
export function scoreChangeRisk(model: ChangeRiskModel | null, change: ChangeFeatures): RiskPrediction {
  if (!model || model.examples < 20 || model.incidents === 0) {
    return { probability: 0, band: 'LOW', drivers: [], fallback: true };
  }

  const features = changeFeatures(change);
  let logNegative = model.logPriors[0];
  let logPositive = model.logPriors[1];
  const drivers: { feature: string; value: string; lift: number }[] = [];

  for (const [name, value] of Object.entries(features)) {
    const key = `${name}=${value}`;
    const row = model.features[key];
    if (!row) continue; // unseen combination carries no evidence
    logNegative += row[0];
    logPositive += row[1];
    const lift = row[1] - row[0];
    if (lift > 0) drivers.push({ feature: name, value, lift: Math.round(lift * 1000) / 1000 });
  }

  const max = Math.max(logNegative, logPositive);
  const expNegative = Math.exp(logNegative - max);
  const expPositive = Math.exp(logPositive - max);
  const probability = Math.round((expPositive / (expPositive + expNegative)) * 1000) / 1000;

  return {
    probability,
    band: BANDS.find(([threshold]) => probability >= threshold)![1],
    drivers: drivers.sort((a, b) => b.lift - a.lift).slice(0, 4),
    fallback: false,
  };
}

/** Human-readable summary of a band, used by the UI and the incident form. */
export function describeBand(band: RiskBand): string {
  switch (band) {
    case 'HIGH':
      return 'High risk — changes like this have been followed by incidents often. Watch this service closely.';
    case 'ELEVATED':
      return 'Elevated risk — similar changes have led to incidents. Keep the rollback handy.';
    case 'GUARDED':
      return 'Guarded — some risk, in line with your history.';
    default:
      return 'Low risk — changes like this rarely cause incidents here.';
  }
}
