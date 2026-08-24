import fs from 'node:fs';

const specPath = new URL('./cactus-canyon-sculpt-spec.json', import.meta.url);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

spec.featureReviewTargets = spec.featureReviewTargets.flatMap((target) => {
  if (!target.passMinimumScores) return [target];
  const baseFeatureId = target.baseFeatureId ?? target.id.split(':')[0];
  return target.passIds.map((passId) => ({
    ...target,
    id: `${baseFeatureId}:${passId}`,
    baseFeatureId,
    passIds: [passId],
    minimumScore: target.passMinimumScores[passId] ?? target.minimumScore,
  }));
});

const stagedIds = new Set(spec.featureReviewTargets.map((target) => target.id));
for (const review of spec.reviewHistory ?? []) {
  for (const featureReview of review.featureReviews ?? []) {
    const stagedId = `${featureReview.id}:${review.passId}`;
    if (stagedIds.has(stagedId)) featureReview.id = stagedId;
  }
}

fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
