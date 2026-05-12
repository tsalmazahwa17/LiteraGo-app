export default function SkeletonGrid({ title = "Memuat data", count = 6 }) {
  return (
    <section className="skeleton-block" aria-busy="true" aria-live="polite">
      <div className="skeleton-heading">
        <span className="skeleton-line short" />
        <strong>{title}</strong>
      </div>
      <div className="book-grid">
        {Array.from({ length: count }).map((_, index) => (
          <article className="book-card skeleton-card" key={index}>
            <span className="skeleton-cover" />
            <div className="book-card-body">
              <span className="skeleton-line" />
              <span className="skeleton-line medium" />
              <span className="skeleton-line short" />
              <span className="skeleton-button" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
