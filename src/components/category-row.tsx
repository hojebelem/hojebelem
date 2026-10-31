import Link from "next/link";
import { ScrollRow } from "./scroll-row";

export function CategoryRow({
  categories,
}: {
  categories: { id: string; name: string; slug: string; icon: string }[];
}) {
  return (
    <ScrollRow className="category-row">
      {categories.map((c) => (
        <Link
          href={`/eventos?categoria=${c.slug}`}
          key={c.id}
          className="category-pill"
        >
          <span>{c.icon}</span>
          {c.name}
        </Link>
      ))}
    </ScrollRow>
  );
}
