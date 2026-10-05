export interface BinaryMetrics {
  /** Of the jobs we flagged, how many were right. */
  precision: number | null;
  /** Of the jobs that really are positive, how many we caught. */
  recall: number | null;
  f1: number | null;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  support: number;
}

/** Precision/recall of "predicted === positive" against hand labels. */
export function binaryMetrics<T>(
  pairs: ReadonlyArray<{ predicted: T; actual: T }>,
  positive: T,
): BinaryMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const { predicted, actual } of pairs) {
    if (predicted === positive && actual === positive) tp++;
    else if (predicted === positive) fp++;
    else if (actual === positive) fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : null;
  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    support: tp + fn,
  };
}

export function accuracy<T>(pairs: ReadonlyArray<{ predicted: T; actual: T }>): number | null {
  if (pairs.length === 0) return null;
  return pairs.filter(({ predicted, actual }) => predicted === actual).length / pairs.length;
}

/** rows = actual, columns = predicted. */
export function confusionMatrix<T extends string>(
  pairs: ReadonlyArray<{ predicted: T; actual: T }>,
  classes: readonly T[],
): Record<T, Record<T, number>> {
  const matrix = Object.fromEntries(
    classes.map((actual) => [actual, Object.fromEntries(classes.map((predicted) => [predicted, 0]))]),
  ) as Record<T, Record<T, number>>;
  for (const { predicted, actual } of pairs) matrix[actual][predicted]++;
  return matrix;
}

export const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`);
