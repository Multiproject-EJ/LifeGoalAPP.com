import { FeaturePreviewOverlay } from '../components/FeaturePreviewOverlay';

export default function FeatureUnlockPreview() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #102840, #06101f)',
      }}
    >
      <FeaturePreviewOverlay
        featureId="actions.visionBoard"
        label="Vision Board"
        voteLabel="Shape this unlock"
        onClose={() => {}}
      />
    </main>
  );
}
