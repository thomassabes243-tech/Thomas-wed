"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function PortalProductForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setConfirmation("");
    try {
      const response = await fetch(
        "/api/portal/businesses/" + encodeURIComponent(businessId) + "/products",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, category, price, description }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.product?.id) {
        throw new Error(result.error || "No fue posible guardar el producto.");
      }
      setConfirmation("Producto guardado: " + result.product.name);
      setName("");
      setCategory("");
      setPrice("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="new-product-title">
      <h2 id="new-product-title">Agregar producto al catálogo</h2>
      <p>Los productos se guardan en la empresa seleccionada y aparecerán en su catálogo.</p>
      <form onSubmit={submit}>
        <div>
          <label htmlFor="portal-product-name">Nombre del producto</label>
          <input id="portal-product-name" value={name} maxLength={160} required
            onChange={event => setName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="portal-product-category">Categoría (opcional)</label>
          <input id="portal-product-category" value={category} maxLength={80}
            onChange={event => setCategory(event.target.value)} />
        </div>
        <div>
          <label htmlFor="portal-product-price">Precio en la moneda configurada (opcional)</label>
          <input id="portal-product-price" value={price} inputMode="decimal"
            pattern="[0-9]{1,10}(\\.[0-9]{1,2})?" placeholder="3500.00"
            onChange={event => setPrice(event.target.value)} />
        </div>
        <div>
          <label htmlFor="portal-product-description">Descripción (opcional)</label>
          <textarea id="portal-product-description" value={description} maxLength={2000}
            onChange={event => setDescription(event.target.value)} />
        </div>
        <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar producto"}</button>
        {error && <p role="alert">{error}</p>}
        {confirmation && <p role="status">{confirmation}</p>}
      </form>
    </section>
  );
}
