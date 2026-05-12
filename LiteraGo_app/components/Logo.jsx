import Link from "next/link";

export default function Logo({
  compact = false,
  href = "/",
  onClick,
  ariaLabel = "Logo LiteraGo"
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`logo ${compact ? "compact" : ""}`}
      aria-label={ariaLabel}
    >
      <img
        src="/logo-literago.png"
        alt="LiteraGo"
        className={`logo-image ${compact ? "compact" : ""}`}
      />
    </Link>
  );
}
