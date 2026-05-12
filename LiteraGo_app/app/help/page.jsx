"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import Toast from "@/components/Toast";
import { faqs } from "@/lib/data";

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("FAQ");
  const [openQuestion, setOpenQuestion] = useState(faqs[0]?.question || "");
  const [toast, setToast] = useState("");
  const groups = ["FAQ", "Rekomendasi", "Pembayaran", "Keamanan", "Peminjaman", "Akun", "Notifikasi"];

  const visibleFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const byGroup = activeGroup === "FAQ" ? true : faq.group === activeGroup;
      const byQuery = [faq.group, faq.question, faq.answer].join(" ").toLowerCase().includes(query.toLowerCase());
      return byGroup && byQuery;
    });
  }, [query, activeGroup]);

  function contact(type) {
    setToast(`${type} akan diarahkan ke layanan bantuan resmi LiteraGo.`);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Pusat Bantuan</span>
        <h1 className="section-title">Ada kendala saat memakai <span>LiteraGo?</span></h1>
        <p className="section-lead">
          Klik pertanyaan yang sesuai. Jawaban akan terbuka tepat di bawah pertanyaan supaya halaman bantuan terasa lebih ringkas.
        </p>
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari bantuan..."
        />
        <div className="tabs">
          {groups.map((group) => (
            <button
              key={group}
              className={`tab-btn ${activeGroup === group ? "active" : ""}`}
              onClick={() => {
                setActiveGroup(group);
                setOpenQuestion("");
              }}
            >
              {group}
            </button>
          ))}
        </div>
      </section>

      <section className="help-grid">
        <div className="faq-list accordion-list">
          {visibleFaqs.map((faq) => {
            const isOpen = openQuestion === faq.question;
            return (
              <article className={`faq-item accordion-item ${isOpen ? "open" : ""}`} key={faq.question}>
                <button
                  className="faq-question"
                  type="button"
                  onClick={() => setOpenQuestion(isOpen ? "" : faq.question)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-group">{faq.group}</span>
                  <strong>{faq.question}</strong>
                  <Icon name={isOpen ? "chevronUp" : "chevronDown"} size={20} />
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </article>
            );
          })}
          {!visibleFaqs.length && (
            <div className="empty-state compact-empty">
              <div>
                <Icon name="help-circle" size={42} />
                <h2>Pertanyaan belum ditemukan</h2>
                <p>Coba pakai kata kunci lain atau pilih tab FAQ untuk melihat semua bantuan.</p>
              </div>
            </div>
          )}
        </div>
        <aside className="panel-card help-contact-card">
          <h2>HUBUNGI KAMI</h2>
          <p>Butuh bantuan langsung? Pilih salah satu kontak berikut.</p>
          <div className="contact-stack" style={{ marginTop: 18 }}>
            <button className="primary-btn" onClick={() => contact("Chat Sekarang")}>Chat Sekarang</button>
            <button className="secondary-btn" onClick={() => contact("Telepon")}>Telepon</button>
            <button className="secondary-btn" onClick={() => contact("Email")}>Email</button>
          </div>
        </aside>
      </section>
      <Toast message={toast} />
    </PageShell>
  );
}
