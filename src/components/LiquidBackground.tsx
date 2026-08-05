/**
 * LiquidBackground — fixed animated blobs behind all content.
 * Respects prefers-reduced-motion (CSS handles it).
 */
export default function LiquidBackground() {
  return (
    <div aria-hidden="true" className="liquid-bg-fixed">
      <div className="liquid-blob-1" />
      <div className="liquid-blob-2" />
      <div className="liquid-blob-3" />
    </div>
  );
}
