/** Five-star display that renders halves, used everywhere a rating appears. */
export default function Stars({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, clamped - index));
        return <Star key={index} fill={fill} size={size} />;
      })}
    </span>
  );
}

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `star-${Math.round(fill * 100)}-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} className="[stop-color:var(--color-olive-300)]" />
          <stop offset={`${fill * 100}%`} className="[stop-color:var(--color-taupe-100)]" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}
