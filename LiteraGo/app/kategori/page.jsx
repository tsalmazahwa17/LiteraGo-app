import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import KategoriClient from "./KategoriClient";

export default function CategoryPage() {
  return (
    <Suspense fallback={<PageShell><SkeletonGrid title="Menyiapkan kategori item" count={6} /></PageShell>}>
      <KategoriClient />
    </Suspense>
  );
}
