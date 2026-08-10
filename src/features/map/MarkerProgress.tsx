"use client";

type MarkerProgressProps = {
  free?: number;
  total?: number;
  className?: string;
};

/** Белая обводка маркера. */
export default function MarkerProgress({
  className = "map-marker__progress",
}: MarkerProgressProps) {
  return <span className={className} aria-hidden />;
}
