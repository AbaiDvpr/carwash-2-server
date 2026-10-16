import "./month-spend.css";

export function MonthSpendCard({
  copy,
}: {
  copy: { title: string; left: string; meta: string };
}) {
  return (
    <div className="wash-month-limit">
      <p className="wash-month-limit__kicker">{copy.title}</p>
      <p className="wash-month-limit__left">{copy.left}</p>
      <p className="wash-month-limit__meta">{copy.meta}</p>
    </div>
  );
}
