"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import { faqs } from "@/lib/data";

const helpGroups = [
  "FAQ",
  "Rekomendasi",
  "Pembayaran",
  "Keamanan",
  "Peminjaman",
  "Akun",
  "Notifikasi",
];

const whatsappLink = "https://wa.me/6287765432823";
const gmailComposeLink =
  "https://mail.google.com/mail/?view=cm&fs=1&to=bagusganz65%40gmail.com&su=Bantuan%20LiteraGo&body=Halo%20LiteraGo%2C%0A%0ASaya%20ingin%20bertanya%20tentang%20";

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("FAQ");
  const [openQuestion, setOpenQuestion] = useState(faqs[0]?.question || "");

  const visibleFaqs = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      const byGroup = activeGroup === "FAQ" ? true : faq.group === activeGroup;
      const byQuery = [faq.group, faq.question, faq.answer]
        .join(" ")
        .toLowerCase()
        .includes(keyword);

      return byGroup && byQuery;
    });
  }, [query, activeGroup]);

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Pusat Bantuan</span>
        <h1 className="section-title">
          Ada kendala saat memakai <span>LiteraGo?</span>
        </h1>
        <p className="section-lead">
          Temukan jawaban dari pertanyaan yang paling sering ditanyakan, atau
          hubungi tim LiteraGo melalui WhatsApp dan email.
        </p>

        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari bantuan..."
        />

        <div className="tabs">
          {helpGroups.map((group) => (
            <button
              key={group}
              className={`tab-btn ${activeGroup === group ? "active" : ""}`}
              type="button"
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
              <article
                className={`faq-item accordion-item ${isOpen ? "open" : ""}`}
                key={faq.question}
              >
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
                <p>
                  Coba gunakan kata kunci lain atau pilih tab FAQ untuk melihat
                  seluruh daftar bantuan.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="panel-card help-contact-card">
          <h2>HUBUNGI KAMI</h2>
          <p>
            Butuh bantuan langsung? Tim LiteraGo siap membantu melalui WhatsApp
            atau email.
          </p>

          <div className="contact-stack" style={{ marginTop: 18 }}>
            <a
              className="primary-btn"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat Sekarang
            </a>

            <a
              className="secondary-btn"
              href={gmailComposeLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Email
            </a>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
