import { useTranslation } from 'react-i18next';

export const RATING_EMOJI = { 1: '😞', 2: '😐', 3: '😊' };

export function RatingBadge({ value }) {
  const { t } = useTranslation();
  return (
    <span className={`rating-badge r${value}`}>
      {RATING_EMOJI[value]} {t(`rating.${value}`)}
    </span>
  );
}

// avg between 1 and 3 -> nearest emoji
export function AvgRating({ value }) {
  const rounded = Math.min(3, Math.max(1, Math.round(Number(value))));
  return (
    <span title={Number(value).toFixed(1)}>
      {RATING_EMOJI[rounded]} {Number(value).toFixed(1)}/3
    </span>
  );
}
