import { toggleWishlistAction } from "@/app/actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Heart } from "lucide-react";
import { cache } from "react";

// uma consulta por página (cache() vale durante a requisição), não uma por card
const getSavedEventIds = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return new Set<string>();
  const rows = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    select: { eventId: true },
  });
  return new Set(rows.map((row) => row.eventId));
});

export async function FavoriteButton({
  eventId,
  className = "heart-button",
}: {
  eventId: string;
  className?: string;
}) {
  const saved = (await getSavedEventIds()).has(eventId);
  const action = toggleWishlistAction.bind(null, eventId);
  return (
    <form action={action} className="favorite-form">
      <button
        type="submit"
        className={`${className}${saved ? " favorite-active" : ""}`}
        aria-label={saved ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={saved}
      >
        <Heart fill={saved ? "currentColor" : "none"} />
      </button>
    </form>
  );
}
