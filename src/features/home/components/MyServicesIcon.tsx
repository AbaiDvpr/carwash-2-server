/** Иконка «Мои услуги»: тележка маркета с мойкой и ЭЗС внутри */
export default function MyServicesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {/* Ручка */}
      <path
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.55 4.35h2.2L6.4 16.2h11.35"
      />
      {/* Корзина */}
      <path
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.45 6.7h14.9l-1.55 7.7H6.85"
      />
      {/* Колёса */}
      <circle cx="8.55" cy="19.2" r="1.4" fill="currentColor" />
      <circle cx="16.45" cy="19.2" r="1.4" fill="currentColor" />

      {/* Мойка — капля */}
      <path
        fill="currentColor"
        d="M9.05 11.05c0-.9 1.1-2.2 1.1-2.2s1.1 1.3 1.1 2.2a1.1 1.1 0 1 1-2.2 0Z"
      />
      {/* ЭЗС — молния */}
      <path
        fill="currentColor"
        d="M15.15 13.2h-.45l.35-1.85h-1.55l1.75-3.05h.45l-.35 1.75h1.55L15.15 13.2Z"
      />
    </svg>
  );
}
