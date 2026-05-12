"use client";

import { useState } from "react";

export default function BookCover({ book, size = "md" }) {
  const [failed, setFailed] = useState(false);
  const hasCoverImage = Boolean(book?.coverImage) && !failed;
  const coverLabel = book?.type === "Majalah" ? "MG" : book?.type === "Koran" ? "KR" : "LG";

  return (
    <div
      className={`book-cover ${book?.coverTone || "blue"} ${hasCoverImage ? "with-image" : "generated-cover"} ${size}`}
      aria-label={`Sampul ${book?.title || "item"}`}
    >
      {hasCoverImage ? (
        <img
          src={book.coverImage}
          alt={`Sampul ${book.title}`}
          className="cover-img"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="cover-mark">{coverLabel}</span>
      )}
    </div>
  );
}
