interface ScreenBackButtonProps {
  onBack: () => void;
  /** Accessible label; defaults to "Back". */
  label?: string;
  disabled?: boolean;
}

/**
 * Universal top-left back arrow (Phase 10B-P4). 44x44 touch target, safe-area
 * aware, SVG chevron (no font-dependent glyph). Destinations are explicit
 * callbacks from App's state machine — never window.history.
 */
export default function ScreenBackButton({
  onBack,
  label = "Back",
  disabled = false,
}: ScreenBackButtonProps) {
  return (
    <button
      className="screen-back"
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onBack}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 5 L8 12 L15 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
