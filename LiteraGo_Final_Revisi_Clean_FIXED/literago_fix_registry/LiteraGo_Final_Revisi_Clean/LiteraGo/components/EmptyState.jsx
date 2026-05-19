import Link from "next/link";
import Icon from "./Icon";

export default function EmptyState({ title, description, actionHref, actionLabel, icon }) {
  return (
    <div className="empty-state">
      <div>
        <div className="empty-icon">{icon || <Icon name="book-open" size={42} strokeWidth={1.8} />}</div>
        <h2>{title}</h2>
        <p>{description}</p>
        {actionHref && (
          <Link className="primary-btn" href={actionHref}>
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
