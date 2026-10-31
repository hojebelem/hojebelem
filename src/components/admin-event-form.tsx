import type { EventStatusOverride } from "@prisma/client";
import { AdminCoverPreview } from "./admin-cover-preview";

const FORM_ERRORS: Record<string, string> = {
  dados: "Não foi possível salvar. Confira os campos e tente de novo.",
  datas: "A hora final precisa ser depois do início.",
};

type CategoryOption = { id: string; name: string; icon: string };
type EventDefaults = {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  startAt: string;
  endAt: string;
  venueName: string;
  address: string;
  coverImageUrl: string;
  externalPurchaseLink: string;
  socialLink: string;
  price: string;
  statusOverride: EventStatusOverride | null;
  isPublished: boolean;
  isFeatured: boolean;
};

export function AdminEventForm({
  categories,
  action,
  event,
  error,
}: {
  categories: CategoryOption[];
  action: (formData: FormData) => void | Promise<void>;
  event?: EventDefaults;
  error?: string;
}) {
  return (
    <form className="event-form" action={action}>
      {error && FORM_ERRORS[error] && (
        <p className="auth-error">{FORM_ERRORS[error]}</p>
      )}
      {event && <input type="hidden" name="slug" value={event.slug} />}
      <section>
        <h2>Informações principais</h2>
        <label>
          Título
          <input
            name="title"
            defaultValue={event?.title}
            required
            placeholder="Nome do evento"
          />
        </label>
        <label>
          Descrição
          <textarea
            name="description"
            defaultValue={event?.description}
            rows={6}
            minLength={20}
            required
            placeholder="Conte o que torna este evento especial"
          />
        </label>
        <label>
          Categoria
          <select
            name="category"
            defaultValue={event?.categoryId ?? ""}
            required
          >
            <option value="">Selecione</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section>
        <h2>Quando e onde</h2>
        <div className="form-grid">
          <label>
            Data e hora
            <input
              type="datetime-local"
              name="startAt"
              defaultValue={event?.startAt}
              required
            />
          </label>
          <label>
            Fim (opcional)
            <input
              type="datetime-local"
              name="endAt"
              defaultValue={event?.endAt}
            />
          </label>
        </div>
        <label>
          Local
          <input
            name="venueName"
            defaultValue={event?.venueName}
            required
            placeholder="Nome do espaço"
          />
        </label>
        <label>
          Endereço
          <input
            name="address"
            defaultValue={event?.address}
            required
            placeholder="Rua, número e bairro"
          />
        </label>
      </section>
      <section>
        <h2>Divulgação e publicação</h2>
        <AdminCoverPreview
          defaultValue={event?.coverImageUrl ?? "/images/hero-belem.webp"}
        />
        <label>
          Link de compra ou reserva
          <input
            type="url"
            name="externalPurchaseLink"
            defaultValue={event?.externalPurchaseLink}
            required
            placeholder="https://"
          />
        </label>
        <label>
          Link da rede social
          <input
            type="url"
            name="socialLink"
            defaultValue={event?.socialLink}
            placeholder="https://"
          />
        </label>
        <div className="form-grid">
          <label>
            Preço
            <input
              type="number"
              name="price"
              defaultValue={event?.price}
              min="0"
              step="0.01"
            />
          </label>
          <label>
            Status
            <select
              name="status"
              defaultValue={event?.statusOverride ?? "AUTOMATIC"}
            >
              <option value="AUTOMATIC">Automático</option>
              <option value="POSTPONED">Adiado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
        </div>
        <div className="checks">
          <label>
            <input
              type="checkbox"
              name="published"
              defaultChecked={event?.isPublished}
            />{" "}
            Publicado
            <small>
              Desmarcado, o evento fica como rascunho e não aparece no site.
            </small>
          </label>
          <label>
            <input
              type="checkbox"
              name="featured"
              defaultChecked={event?.isFeatured}
            />{" "}
            Marcar como destaque
          </label>
        </div>
      </section>
      <button className="gradient-button" type="submit">
        {event ? "Salvar alterações" : "Criar evento"}
      </button>
    </form>
  );
}
