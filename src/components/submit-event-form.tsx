import { submitEventAction } from "@/app/actions";

type CategoryOption = { id: string; name: string; icon: string };

export function SubmitEventForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  return (
    <form className="event-form" action={submitEventAction}>
      <section>
        <h2>Informações principais</h2>
        <label>
          Título
          <input name="title" required placeholder="Nome do evento" />
        </label>
        <label>
          Descrição
          <textarea
            name="description"
            rows={6}
            minLength={20}
            required
            placeholder="Conte o que torna este evento especial"
          />
        </label>
        <label>
          Categoria
          <select name="category" defaultValue="" required>
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
            <input type="datetime-local" name="startAt" required />
          </label>
          <label>
            Fim (opcional)
            <input type="datetime-local" name="endAt" />
          </label>
        </div>
        <label>
          Local
          <input name="venueName" required placeholder="Nome do espaço" />
        </label>
        <label>
          Endereço
          <input
            name="address"
            required
            placeholder="Rua, número e bairro"
          />
        </label>
      </section>
      <section>
        <h2>Divulgação</h2>
        <label>
          Link de compra ou reserva
          <input
            type="url"
            name="externalPurchaseLink"
            required
            placeholder="https://"
          />
        </label>
        <label>
          Link da rede social (opcional)
          <input type="url" name="socialLink" placeholder="https://" />
        </label>
        <label>
          URL da imagem de capa (opcional)
          <input
            type="text"
            name="coverImageUrl"
            placeholder="https://... ou /images/..."
          />
        </label>
        <label>
          Preço (deixe vazio se for gratuito)
          <input type="number" name="price" min="0" step="0.01" />
        </label>
      </section>
      <button className="gradient-button" type="submit">
        Enviar para revisão
      </button>
    </form>
  );
}
