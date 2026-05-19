import Icon from "@/components/Icon";

export default function Loading() {
  return (
    <main className="page-shell">
      <section className="section-block" style={{ marginTop: 0 }}>
        <div className="skeleton-block" aria-label="Memuat halaman">
          <div className="skeleton-heading">
            <Icon name="book" size={22} />
            <span>Memuat LiteraGo...</span>
          </div>

          <div className="skeleton-card panel-card">
            <span className="skeleton-line wide" />
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
            <span className="skeleton-button" />
          </div>
        </div>
      </section>
    </main>
  );
}
