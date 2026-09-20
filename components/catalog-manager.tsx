"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/catalog/catalog.module.css";
import WhatsAppConnectionPanel from "@/components/whatsapp-connection-panel";

type Business = { id: string; name: string; country: string | null; type?: string | null; phoneNumber?: string | null; address?: string | null };
type Tab = "clientes" | "resumen" | "catalogo" | "simulador" | "conversaciones" | "importar" | "whatsapp" | "configuracion";

type Dashboard = {
  business: Business & {
    type?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
  };
  metrics: {
    activeProducts: number;
    inactiveProducts: number;
    imports: number;
    openConversations: number;
    humanRequired: number;
    categories: number;
  };
  categories: string[];
  recentImports: Array<{
    id: string;
    filename: string;
    status: string;
    importedRows: number;
    updatedRows: number;
    rejectedRows: number;
    createdAt: string;
  }>;
};

type Product = {
  id: string;
  externalCode: string | null;
  sku: string | null;
  name: string;
  category: string | null;
  description: string | null;
  price: string | null;
  stock: string | null;
  presentation: string | null;
  unit: string | null;
  serviceType: string | null;
  location: string | null;
  duration: string | null;
  capacity: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  includes: string | null;
  amenities: string | null;
  availabilityNote: string | null;
  reservationRequired: boolean | null;
  cancellationPolicy: string | null;
  active: boolean;
};

type ConversationItem = {
  id: string;
  status: string;
  assignedToHuman: boolean;
  lastMessageAt: string;
  customer: { id: string; name: string | null; whatsappNumber: string };
  messages: Array<{ id: string; direction: "inbound" | "outbound"; content: string; createdAt: string }>;
};

type Settings = {
  business: {
    id: string;
    name: string;
    type: string | null;
    description: string | null;
    address: string | null;
    phoneNumber: string | null;
    country: string | null;
    botConfig: {
      systemInstructions: string;
      tone: string;
      welcomeMessage: string;
      fallbackMessage: string;
      humanHandoffMessage: string;
      active: boolean;
    } | null;
  };
};

type Mapping = Record<string, string | undefined>;
type Preview = {
  importId: string;
  filename: string;
  totalRows: number;
  headers: string[];
  suggestedMapping: Mapping;
  previewRows: Record<string, unknown>[];
  warnings: string[];
  validationErrors: Array<{ row: number; reason: string }>;
};

const EMPTY_PRODUCT = {
  externalCode: "",
  sku: "",
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  presentation: "",
  unit: "",
  serviceType: "",
  location: "",
  duration: "",
  capacity: "",
  checkInTime: "",
  checkOutTime: "",
  includes: "",
  amenities: "",
  availabilityNote: "",
  reservationRequired: "",
  cancellationPolicy: "",
};

type ProductDraft = typeof EMPTY_PRODUCT;

const importFields = [
  ["externalCode", "Código"],
  ["sku", "SKU"],
  ["name", "Nombre *"],
  ["category", "Categoría"],
  ["description", "Descripción"],
  ["price", "Precio"],
  ["stock", "Existencia"],
  ["unit", "Precio por / unidad"],
  ["serviceType", "Tipo de servicio"],
  ["location", "Ubicación"],
  ["duration", "Duración"],
  ["capacity", "Capacidad"],
  ["checkInTime", "Check-in"],
  ["checkOutTime", "Check-out"],
  ["includes", "Incluye"],
  ["amenities", "Amenidades"],
  ["availabilityNote", "Disponibilidad"],
  ["reservationRequired", "Requiere reserva"],
  ["cancellationPolicy", "Cancelación"],
] as const;

function productToDraft(product: Product): ProductDraft {
  return {
    externalCode: product.externalCode ?? "",
    sku: product.sku ?? "",
    name: product.name,
    category: product.category ?? "",
    description: product.description ?? "",
    price: product.price ?? "",
    stock: product.stock ?? "",
    presentation: product.presentation ?? "",
    unit: product.unit ?? "",
    serviceType: product.serviceType ?? "",
    location: product.location ?? "",
    duration: product.duration ?? "",
    capacity: product.capacity === null ? "" : String(product.capacity),
    checkInTime: product.checkInTime ?? "",
    checkOutTime: product.checkOutTime ?? "",
    includes: product.includes ?? "",
    amenities: product.amenities ?? "",
    availabilityNote: product.availabilityNote ?? "",
    reservationRequired:
      product.reservationRequired === null ? "" : product.reservationRequired ? "true" : "false",
    cancellationPolicy: product.cancellationPolicy ?? "",
  };
}

export default function CatalogManager({ previewOnly = false }: { previewOnly?: boolean }) {
  const [tab, setTab] = useState<Tab>("clientes");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [businessDraft, setBusinessDraft] = useState({
    name: "",
    type: "Farmacia",
    country: "Costa Rica",
    phoneNumber: "",
    address: "",
    description: "",
  });

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>({ ...EMPTY_PRODUCT });
  const [showProductForm, setShowProductForm] = useState(false);

  const [testQuery, setTestQuery] = useState("");
  const [botAnswer, setBotAnswer] = useState("");
  const [testingAnswer, setTestingAnswer] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [importMode, setImportMode] = useState<"update" | "replace">("update");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);

  useEffect(() => {
    void loadBusinesses();
  }, []);

  async function loadBusinesses() {
    try {
      const response = await fetch("/api/catalog/businesses");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las empresas.");
      const list = data.businesses ?? [];
      setBusinesses(list);
      if (!list.length) setShowNewBusiness(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar las empresas.");
    }
  }

  async function createBusiness() {
    if (!businessDraft.name.trim() || !businessDraft.type.trim()) {
      setMessage("Poné el nombre de la empresa y el tipo de negocio.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/catalog/businesses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(businessDraft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear la empresa.");

      await loadBusinesses();
      setShowNewBusiness(false);
      setBusinessDraft({
        name: "",
        type: "Farmacia",
        country: "Costa Rica",
        phoneNumber: "",
        address: "",
        description: "",
      });
      await selectBusiness(data.business.id);
      setTab("resumen");
      setMessage(`${data.business.name} creada. Ya podés cargar su información y probar el bot.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la empresa.");
    } finally {
      setBusy(false);
    }
  }

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === businessId),
    [businesses, businessId],
  );

  async function selectBusiness(nextId: string) {
    if (!nextId) {
      setBusinessId("");
      setDashboard(null);
      setProducts([]);
      setSettings(null);
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/catalog/business/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId: nextId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo seleccionar la empresa.");
      setBusinessId(nextId);
      await Promise.all([loadDashboard(nextId), loadProducts(nextId), loadSettings(nextId), loadConversations(nextId)]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo seleccionar la empresa.");
    } finally {
      setBusy(false);
    }
  }

  async function loadDashboard(id = businessId) {
    if (!id) return;
    const response = await fetch(`/api/catalog/dashboard?businessId=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el resumen.");
    setDashboard(data);
  }

  async function loadProducts(id = businessId) {
    if (!id) return;
    const params = new URLSearchParams({
      businessId: id,
      status: statusFilter,
    });
    if (query.trim()) params.set("q", query.trim());
    if (categoryFilter) params.set("category", categoryFilter);

    const response = await fetch(`/api/catalog/products?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el catálogo.");
    setProducts(data.products ?? []);
  }

  async function loadSettings(id = businessId) {
    if (!id) return;
    const response = await fetch(`/api/catalog/settings?businessId=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la configuración.");
    setSettings(data);
  }

  async function loadConversations(id = businessId) {
    if (!id) return;
    const response = await fetch(`/api/catalog/conversations?businessId=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los chats.");
    setConversations(data.conversations ?? []);
  }

  async function updateConversation(conversationId: string, action: "take" | "release" | "close") {
    if (!businessId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/catalog/conversations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, conversationId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el chat.");
      await Promise.all([loadConversations(), loadDashboard()]);
      setMessage(action === "close" ? "Conversación cerrada." : action === "take" ? "Chat tomado por una persona." : "Chat devuelto al bot.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el chat.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (businessId && tab === "catalogo") {
      const timer = window.setTimeout(() => {
        void loadProducts();
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [query, categoryFilter, statusFilter, businessId, tab]);

  function openNewProduct() {
    setEditingProduct(null);
    setProductDraft({ ...EMPTY_PRODUCT });
    setShowProductForm(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductDraft(productToDraft(product));
    setShowProductForm(true);
  }

  async function saveProduct() {
    if (!businessId || !productDraft.name.trim()) {
      setMessage("Escribí al menos el nombre del producto o servicio.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const url = editingProduct
        ? `/api/catalog/products/${editingProduct.id}`
        : "/api/catalog/products";
      const response = await fetch(url, {
        method: editingProduct ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, ...productDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setShowProductForm(false);
      setEditingProduct(null);
      setProductDraft({ ...EMPTY_PRODUCT });
      setMessage(editingProduct ? "Servicio actualizado." : "Servicio agregado al catálogo.");
      await Promise.all([loadProducts(), loadDashboard()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(product: Product) {
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, active: !product.active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      setMessage(product.active ? "Servicio desactivado." : "Servicio activado.");
      await Promise.all([loadProducts(), loadDashboard()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function testCatalogAnswer() {
    if (!businessId || !testQuery.trim()) return;
    setTestingAnswer(true);
    setBotAnswer("");
    try {
      const response = await fetch("/api/catalog/simulate-inbound", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          message: testQuery,
          customerNumber: "preview-customer",
          customerName: "Cliente de prueba",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar.");
      setBotAnswer(data.reply ?? "");
      await Promise.all([loadConversations(), loadDashboard()]);
    } catch (error) {
      setBotAnswer(error instanceof Error ? error.message : "No se pudo consultar.");
    } finally {
      setTestingAnswer(false);
    }
  }

  async function analyzeFile() {
    if (!businessId || !file) {
      setMessage("Seleccioná una empresa y un archivo CSV o XLSX.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("businessId", businessId);
      form.set("file", file);
      const response = await fetch("/api/catalog/preview", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo analizar.");
      setPreview(data);
      setMapping(data.suggestedMapping ?? {});
      setMessage("Archivo analizado. Revisá los campos antes de importar.");
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "No se pudo analizar.");
    } finally {
      setBusy(false);
    }
  }

  async function importFile() {
    if (!preview || !file || !businessId) return;
    if (!mapping.name || (!mapping.sku && !mapping.externalCode)) {
      setMessage("Mapeá Nombre y Código o SKU.");
      return;
    }
    if (importMode === "replace" && !replaceConfirmed) {
      setMessage("Confirmá que querés reemplazar el catálogo.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("businessId", businessId);
      form.set("importId", preview.importId);
      form.set("mapping", JSON.stringify(mapping));
      form.set("mode", importMode);
      form.set("approved", "true");
      form.set("file", file);
      const response = await fetch("/api/catalog/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo importar.");
      setPreview(null);
      setFile(null);
      setMapping({});
      setReplaceConfirmed(false);
      setMessage(
        `Importación lista: ${data.summary.created} nuevos, ${data.summary.updated} actualizados, ${data.summary.rejected} rechazados.`,
      );
      await Promise.all([loadProducts(), loadDashboard()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo importar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!businessId || !settings) return;
    setBusy(true);
    setMessage("");
    try {
      const b = settings.business;
      const bot = b.botConfig;
      const response = await fetch("/api/catalog/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: b.name,
          type: b.type,
          description: b.description,
          address: b.address,
          phoneNumber: b.phoneNumber,
          country: b.country,
          systemInstructions: bot?.systemInstructions ?? "",
          tone: bot?.tone ?? "amable y breve",
          welcomeMessage: bot?.welcomeMessage ?? "",
          fallbackMessage: bot?.fallbackMessage ?? "",
          humanHandoffMessage: bot?.humanHandoffMessage ?? "",
          botActive: bot?.active ?? true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setMessage("Configuración guardada.");
      await Promise.all([loadSettings(), loadDashboard()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const metricCards = dashboard
    ? [
        ["Servicios activos", dashboard.metrics.activeProducts],
        ["Categorías", dashboard.metrics.categories],
        ["Importaciones", dashboard.metrics.imports],
        ["Chats abiertos", dashboard.metrics.openConversations],
        ["Requieren humano", dashboard.metrics.humanRequired],
        ["Inactivos", dashboard.metrics.inactiveProducts],
      ]
    : [];

  return (
    <div className={styles.appShell}>
      <section className={styles.businessBar}>
        <div>
          <span className={styles.eyebrow}>NEGOCIO ACTIVO</span>
          <select
            value={businessId}
            onChange={(event) => void selectBusiness(event.target.value)}
            disabled={busy}
          >
            <option value="">Seleccionar empresa</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}{business.country ? ` · ${business.country}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.statusPill}>
          <span className={styles.statusDot} />
          Preview seguro
        </div>
      </section>

      <nav className={styles.tabs}>
        {[
          ["clientes", "Clientes"],
          ["resumen", "Resumen"],
          ["catalogo", "Catálogo"],
          ["simulador", "Probar bot"],
          ["conversaciones", "Chats"],
          ["importar", "Importar"],
          ...(previewOnly ? [["whatsapp", "Conectar WhatsApp"]] : []),
          ["configuracion", "Configurar"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? styles.tabActive : styles.tab}
            onClick={() => setTab(value as Tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {message ? <div className={styles.notice}>{message}</div> : null}

      {tab === "clientes" ? (
        <div className={styles.pageStack}>
          <section className={styles.heroCard}>
            <div>
              <span className={styles.eyebrow}>CLIENTES DE METABOT CR</span>
              <h2>Configurá cada negocio desde aquí</h2>
              <p>
                Creá una empresa, elegí su tipo y MetaBot prepara una configuración inicial. Después cargás catálogo, probás respuestas y conectás WhatsApp.
              </p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={() => setShowNewBusiness((value) => !value)}>
              {showNewBusiness ? "Cerrar formulario" : "+ Nueva empresa"}
            </button>
          </section>

          {showNewBusiness ? (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>NUEVO CLIENTE</span>
                  <h3>Datos básicos del negocio</h3>
                </div>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>Nombre de empresa *</span>
                  <input value={businessDraft.name} onChange={(e) => setBusinessDraft({ ...businessDraft, name: e.target.value })} placeholder="Farmacia San José" />
                </label>
                <label>
                  <span>Tipo de negocio *</span>
                  <select value={businessDraft.type} onChange={(e) => setBusinessDraft({ ...businessDraft, type: e.target.value })}>
                    <option>Farmacia</option>
                    <option>Hotel / Hospedaje</option>
                    <option>Tour / Turismo</option>
                    <option>Salón de belleza</option>
                    <option>Taller mecánico</option>
                    <option>Restaurante</option>
                    <option>Tienda</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label>
                  <span>País</span>
                  <input value={businessDraft.country} onChange={(e) => setBusinessDraft({ ...businessDraft, country: e.target.value })} />
                </label>
                <label>
                  <span>Teléfono / WhatsApp</span>
                  <input value={businessDraft.phoneNumber} onChange={(e) => setBusinessDraft({ ...businessDraft, phoneNumber: e.target.value })} placeholder="+506 ..." />
                </label>
                <label className={styles.fullField}>
                  <span>Dirección</span>
                  <input value={businessDraft.address} onChange={(e) => setBusinessDraft({ ...businessDraft, address: e.target.value })} placeholder="Liberia, Guanacaste..." />
                </label>
                <label className={styles.fullField}>
                  <span>Descripción</span>
                  <textarea value={businessDraft.description} onChange={(e) => setBusinessDraft({ ...businessDraft, description: e.target.value })} placeholder="Qué vende, servicios principales, zonas que atiende..." />
                </label>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.primaryButton} onClick={() => void createBusiness()} disabled={busy}>
                  {busy ? "Creando…" : "Crear empresa y configurar bot"}
                </button>
              </div>
              <p className={styles.help}>
                Al crearla, MetaBot aplica reglas iniciales según el tipo de negocio. En farmacia, por ejemplo, deriva consultas clínicas a una persona.
              </p>
            </section>
          ) : null}

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.eyebrow}>EMPRESAS CONFIGURADAS</span>
                <h3>{businesses.length} cliente{businesses.length === 1 ? "" : "s"}</h3>
              </div>
            </div>

            {!businesses.length ? (
              <div className={styles.emptyState}>
                <h3>No hay empresas todavía</h3>
                <p>Creá la primera arriba. Después vas a poder entrar a su panel.</p>
              </div>
            ) : (
              <div className={styles.clientGrid}>
                {businesses.map((business) => (
                  <article className={styles.clientCard} key={business.id}>
                    <div>
                      <span className={styles.activeBadge}>Activo</span>
                      <h3>{business.name}</h3>
                      <p>{business.type || "Negocio"}{business.country ? ` · ${business.country}` : ""}</p>
                    </div>
                    <div className={styles.clientMeta}>
                      {business.phoneNumber ? <span>📱 {business.phoneNumber}</span> : <span>WhatsApp pendiente</span>}
                      {business.address ? <span>📍 {business.address}</span> : <span>Dirección pendiente</span>}
                    </div>
                    <button type="button" className={styles.primaryButton} onClick={async () => { await selectBusiness(business.id); setTab("resumen"); }}>
                      Entrar al negocio
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {!businessId && tab !== "clientes" ? (
        <section className={styles.emptyState}>
          <h2>Primero elegí o creá una empresa</h2>
          <p>Entrá a “Clientes”, creá el negocio y luego vas a poder configurar su bot.</p>
          <button type="button" className={styles.primaryButton} onClick={() => setTab("clientes")}>Ir a Clientes</button>
        </section>
      ) : null}

      {businessId && tab === "resumen" ? (
        <div className={styles.pageStack}>
          <section className={styles.heroCard}>
            <div>
              <span className={styles.eyebrow}>CENTRO DE CONTROL</span>
              <h2>{dashboard?.business.name ?? selectedBusiness?.name}</h2>
              <p>
                Administrá lo que MetaBot puede responder. Los cambios de este panel afectan únicamente este negocio.
              </p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={() => setTab("catalogo")}>
              Ver catálogo
            </button>
          </section>

          <section className={styles.metricGrid}>
            {metricCards.map(([label, value]) => (
              <article className={styles.metricCard} key={String(label)}>
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </section>

          <section className={styles.twoColumn}>
            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>ACCESO RÁPIDO</span>
                  <h3>Qué querés hacer</h3>
                </div>
              </div>
              <div className={styles.quickGrid}>
                <button type="button" onClick={() => { openNewProduct(); setTab("catalogo"); }}>
                  <strong>+ Agregar servicio</strong>
                  <span>Cargar una habitación, tour, producto o servicio manualmente.</span>
                </button>
                <button type="button" onClick={() => setTab("simulador")}>
                  <strong>Probar el bot</strong>
                  <span>Preguntale como lo haría un cliente real.</span>
                </button>
                <button type="button" onClick={() => setTab("importar")}>
                  <strong>Importar Excel/CSV</strong>
                  <span>Para catálogos grandes o actualizaciones masivas.</span>
                </button>
                <button type="button" onClick={() => setTab("configuracion")}>
                  <strong>Configurar negocio</strong>
                  <span>Datos, tono, mensajes y reglas del bot.</span>
                </button>
              </div>
            </article>

            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>ÚLTIMA ACTIVIDAD</span>
                  <h3>Importaciones</h3>
                </div>
              </div>
              {!dashboard?.recentImports.length ? (
                <p className={styles.muted}>Todavía no hay actividad de importación.</p>
              ) : (
                <div className={styles.activityList}>
                  {dashboard.recentImports.map((item) => (
                    <div key={item.id}>
                      <strong>{item.filename}</strong>
                      <span>{item.status} · {new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      ) : null}

      {businessId && tab === "catalogo" ? (
        <div className={styles.pageStack}>
          <section className={styles.toolbarCard}>
            <div>
              <span className={styles.eyebrow}>LO QUE EL BOT SABE</span>
              <h2>Catálogo de servicios y productos</h2>
            </div>
            <button type="button" className={styles.primaryButton} onClick={openNewProduct}>
              + Agregar
            </button>
          </section>

          <section className={styles.filters}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar habitación, tour, producto, código..."
            />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">Todas las categorías</option>
              {dashboard?.categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="all">Todos</option>
            </select>
          </section>

          {showProductForm ? (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>{editingProduct ? "EDITAR" : "NUEVO"}</span>
                  <h3>{editingProduct ? editingProduct.name : "Agregar producto o servicio"}</h3>
                </div>
                <button type="button" className={styles.linkButton} onClick={() => setShowProductForm(false)}>
                  Cerrar
                </button>
              </div>

              <div className={styles.formGrid}>
                <label><span>Nombre *</span><input value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} placeholder="Habitación doble" /></label>
                <label><span>Categoría</span><input value={productDraft.category} onChange={(e) => setProductDraft({ ...productDraft, category: e.target.value })} placeholder="Hospedaje" /></label>
                <label><span>Precio</span><input inputMode="decimal" value={productDraft.price} onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })} placeholder="75" /></label>
                <label><span>Precio por / unidad</span><input value={productDraft.unit} onChange={(e) => setProductDraft({ ...productDraft, unit: e.target.value })} placeholder="noche / persona" /></label>
                <label><span>Código</span><input value={productDraft.externalCode} onChange={(e) => setProductDraft({ ...productDraft, externalCode: e.target.value })} placeholder="HAB-DBL" /></label>
                <label><span>Tipo</span><input value={productDraft.serviceType} onChange={(e) => setProductDraft({ ...productDraft, serviceType: e.target.value })} placeholder="Habitación / Tour" /></label>
                <label><span>Ubicación</span><input value={productDraft.location} onChange={(e) => setProductDraft({ ...productDraft, location: e.target.value })} placeholder="Guanacaste" /></label>
                <label><span>Capacidad</span><input inputMode="numeric" value={productDraft.capacity} onChange={(e) => setProductDraft({ ...productDraft, capacity: e.target.value })} placeholder="2" /></label>
                <label><span>Duración</span><input value={productDraft.duration} onChange={(e) => setProductDraft({ ...productDraft, duration: e.target.value })} placeholder="4 horas" /></label>
                <label><span>Check-in</span><input value={productDraft.checkInTime} onChange={(e) => setProductDraft({ ...productDraft, checkInTime: e.target.value })} placeholder="14:00" /></label>
                <label><span>Check-out</span><input value={productDraft.checkOutTime} onChange={(e) => setProductDraft({ ...productDraft, checkOutTime: e.target.value })} placeholder="11:00" /></label>
                <label><span>Requiere reserva</span><select value={productDraft.reservationRequired} onChange={(e) => setProductDraft({ ...productDraft, reservationRequired: e.target.value })}><option value="">No especificado</option><option value="true">Sí</option><option value="false">No</option></select></label>
                <label className={styles.fullField}><span>Descripción</span><textarea value={productDraft.description} onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })} placeholder="Descripción que puede usar el bot..." /></label>
                <label className={styles.fullField}><span>Incluye</span><textarea value={productDraft.includes} onChange={(e) => setProductDraft({ ...productDraft, includes: e.target.value })} placeholder="Desayuno, transporte, guía..." /></label>
                <label className={styles.fullField}><span>Amenidades</span><textarea value={productDraft.amenities} onChange={(e) => setProductDraft({ ...productDraft, amenities: e.target.value })} placeholder="WiFi, piscina, aire acondicionado..." /></label>
                <label className={styles.fullField}><span>Disponibilidad registrada</span><input value={productDraft.availabilityNote} onChange={(e) => setProductDraft({ ...productDraft, availabilityNote: e.target.value })} placeholder="Sujeto a confirmación" /></label>
                <label className={styles.fullField}><span>Política de cancelación</span><input value={productDraft.cancellationPolicy} onChange={(e) => setProductDraft({ ...productDraft, cancellationPolicy: e.target.value })} placeholder="48 horas" /></label>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowProductForm(false)}>Cancelar</button>
                <button type="button" className={styles.primaryButton} onClick={() => void saveProduct()} disabled={busy}>
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </section>
          ) : null}

          <section className={styles.catalogGrid}>
            {!products.length ? (
              <div className={styles.emptyState}>
                <h3>No hay resultados</h3>
                <p>Agregá un servicio manualmente o importá un archivo.</p>
              </div>
            ) : products.map((product) => (
              <article className={styles.productCard} key={product.id}>
                <div className={styles.productTop}>
                  <div>
                    <span className={product.active ? styles.activeBadge : styles.inactiveBadge}>
                      {product.active ? "Activo" : "Inactivo"}
                    </span>
                    <h3>{product.name}</h3>
                    <p>{product.category ?? product.serviceType ?? "Sin categoría"}</p>
                  </div>
                  <strong className={styles.price}>
                    {product.price ? `${product.price}${product.unit ? ` / ${product.unit.replace(/^por\s+/i, "")}` : ""}` : "Sin precio"}
                  </strong>
                </div>
                <div className={styles.productDetails}>
                  {product.location ? <span>📍 {product.location}</span> : null}
                  {product.capacity !== null ? <span>👥 {product.capacity} personas</span> : null}
                  {product.duration ? <span>⏱ {product.duration}</span> : null}
                  {product.checkInTime ? <span>Entrada {product.checkInTime}</span> : null}
                  {product.includes ? <span>Incluye: {product.includes}</span> : null}
                </div>
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => openEditProduct(product)}>Editar</button>
                  <button type="button" onClick={() => void toggleProduct(product)}>
                    {product.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {businessId && tab === "simulador" ? (
        <div className={styles.pageStack}>
          <section className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div className={styles.botAvatar}>M</div>
              <div>
                <strong>MetaBot · {selectedBusiness?.name}</strong>
                <span>Simulación con datos reales del catálogo</span>
              </div>
            </div>

            <div className={styles.chatBody}>
              <div className={styles.botBubble}>
                Escribí una pregunta como la haría un cliente. Ejemplo: “¿Cuánto cuesta una habitación doble para dos personas?”
              </div>
              {testQuery && botAnswer ? <div className={styles.userBubble}>{testQuery}</div> : null}
              {botAnswer ? <div className={styles.botBubble}>{botAnswer}</div> : null}
            </div>

            <div className={styles.chatComposer}>
              <input
                value={testQuery}
                onChange={(event) => setTestQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && testQuery.trim()) void testCatalogAnswer();
                }}
                placeholder="Preguntale algo al bot..."
              />
              <button type="button" className={styles.primaryButton} onClick={() => void testCatalogAnswer()} disabled={testingAnswer || !testQuery.trim()}>
                {testingAnswer ? "…" : "Enviar"}
              </button>
            </div>

            <div className={styles.suggestions}>
              {["¿Qué habitaciones tienen?", "¿Cuánto cuesta el tour?", "¿Qué incluye?", "¿A qué hora es el check-in?"].map((item) => (
                <button key={item} type="button" onClick={() => setTestQuery(item)}>{item}</button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {businessId && tab === "conversaciones" ? (
        <div className={styles.pageStack}>
          <section className={styles.toolbarCard}>
            <div>
              <span className={styles.eyebrow}>BANDEJA DE ATENCIÓN</span>
              <h2>Conversaciones y traspaso a humano</h2>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={() => void loadConversations()}>
              Actualizar
            </button>
          </section>

          <section className={styles.conversationList}>
            {!conversations.length ? (
              <div className={styles.emptyState}>
                <h3>Todavía no hay conversaciones</h3>
                <p>Probá el bot desde la pestaña “Probar bot” y el chat aparecerá acá.</p>
              </div>
            ) : conversations.map((conversation) => (
              <article className={styles.conversationCard} key={conversation.id}>
                <div className={styles.conversationHeader}>
                  <div>
                    <strong>{conversation.customer.name || conversation.customer.whatsappNumber}</strong>
                    <span>{conversation.customer.whatsappNumber} · {new Date(conversation.lastMessageAt).toLocaleString()}</span>
                  </div>
                  <span className={conversation.status === "human_required" ? styles.humanBadge : styles.activeBadge}>
                    {conversation.status === "human_required" ? "Requiere humano" : conversation.status}
                  </span>
                </div>

                <div className={styles.miniThread}>
                  {conversation.messages.slice(-6).map((msg) => (
                    <div key={msg.id} className={msg.direction === "inbound" ? styles.inboundMini : styles.outboundMini}>
                      <b>{msg.direction === "inbound" ? "Cliente" : "MetaBot"}</b>
                      <span>{msg.content}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.cardActions}>
                  {!conversation.assignedToHuman ? (
                    <button type="button" onClick={() => void updateConversation(conversation.id, "take")}>Tomar chat</button>
                  ) : (
                    <button type="button" onClick={() => void updateConversation(conversation.id, "release")}>Devolver al bot</button>
                  )}
                  <button type="button" onClick={() => void updateConversation(conversation.id, "close")}>Cerrar</button>
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {businessId && tab === "importar" ? (
        <div className={styles.pageStack}>
          <section className={styles.card}>
            <span className={styles.eyebrow}>CARGA MASIVA</span>
            <h2>Importar Excel o CSV</h2>
            <p className={styles.muted}>Usalo cuando el negocio ya tenga una tabla. Para cambios pequeños, es más rápido editar el catálogo manualmente.</p>
            <div className={styles.uploadBox}>
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                }}
              />
              <button type="button" className={styles.primaryButton} onClick={() => void analyzeFile()} disabled={!file || busy}>
                {busy ? "Analizando…" : "Analizar archivo"}
              </button>
            </div>
          </section>

          {preview ? (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.eyebrow}>REVISIÓN ANTES DE IMPORTAR</span>
                  <h3>{preview.filename}</h3>
                </div>
                <span className={styles.countBadge}>{preview.totalRows} filas</span>
              </div>

              {preview.warnings.map((warning) => <div className={styles.warning} key={warning}>{warning}</div>)}
              {preview.validationErrors.map((error) => <div className={styles.warning} key={`${error.row}-${error.reason}`}>Fila {error.row}: {error.reason}</div>)}

              <div className={styles.mappingGrid}>
                {importFields.map(([field, label]) => (
                  <label key={field}>
                    <span>{label}</span>
                    <select value={mapping[field] ?? ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || undefined })}>
                      <option value="">No importar</option>
                      {preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>

              <div className={styles.previewRows}>
                {preview.previewRows.slice(0, 3).map((row, index) => (
                  <div key={index}>
                    <strong>Fila {index + 2}</strong>
                    {preview.headers.slice(0, 6).map((header) => <span key={header}>{header}: {String(row[header] ?? "—")}</span>)}
                  </div>
                ))}
              </div>

              <div className={styles.importMode}>
                <label><input type="radio" checked={importMode === "update"} onChange={() => setImportMode("update")} /> Actualizar sin borrar ausentes</label>
                <label><input type="radio" checked={importMode === "replace"} onChange={() => setImportMode("replace")} /> Reemplazar catálogo</label>
              </div>
              {importMode === "replace" ? (
                <label className={styles.confirmLine}><input type="checkbox" checked={replaceConfirmed} onChange={(e) => setReplaceConfirmed(e.target.checked)} /> Confirmo el reemplazo.</label>
              ) : null}
              <div className={styles.actions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setPreview(null)}>Cancelar</button>
                <button type="button" className={styles.primaryButton} onClick={() => void importFile()} disabled={busy}>Importar catálogo</button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {businessId && tab === "whatsapp" && previewOnly ? (
        <WhatsAppConnectionPanel businessId={businessId} />
      ) : null}

      {businessId && tab === "configuracion" && settings ? (
        <div className={styles.pageStack}>
          <section className={styles.card}>
            <span className={styles.eyebrow}>DATOS DEL NEGOCIO</span>
            <h2>Información que usa MetaBot</h2>
            <div className={styles.formGrid}>
              <label><span>Nombre</span><input value={settings.business.name} onChange={(e) => setSettings({ business: { ...settings.business, name: e.target.value } })} /></label>
              <label><span>Tipo de negocio</span><input value={settings.business.type ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, type: e.target.value } })} placeholder="Hotel, tour operador..." /></label>
              <label><span>País</span><input value={settings.business.country ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, country: e.target.value } })} /></label>
              <label><span>Teléfono</span><input value={settings.business.phoneNumber ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, phoneNumber: e.target.value } })} /></label>
              <label className={styles.fullField}><span>Dirección</span><input value={settings.business.address ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, address: e.target.value } })} /></label>
              <label className={styles.fullField}><span>Descripción</span><textarea value={settings.business.description ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, description: e.target.value } })} /></label>
            </div>
          </section>

          <section className={styles.card}>
            <span className={styles.eyebrow}>COMPORTAMIENTO DEL BOT</span>
            <h2>Cómo debe responder</h2>
            <div className={styles.formGrid}>
              <label><span>Tono</span><input value={settings.business.botConfig?.tone ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, botConfig: { ...(settings.business.botConfig ?? { systemInstructions: "", welcomeMessage: "", fallbackMessage: "", humanHandoffMessage: "", active: true, tone: "" }), tone: e.target.value } } })} placeholder="amable y breve" /></label>
              <label><span>Estado</span><select value={settings.business.botConfig?.active === false ? "false" : "true"} onChange={(e) => setSettings({ business: { ...settings.business, botConfig: { ...(settings.business.botConfig ?? { systemInstructions: "", welcomeMessage: "", fallbackMessage: "", humanHandoffMessage: "", tone: "amable y breve", active: true }), active: e.target.value === "true" } } })}><option value="true">Activo</option><option value="false">Pausado</option></select></label>
              <label className={styles.fullField}><span>Mensaje de bienvenida</span><textarea value={settings.business.botConfig?.welcomeMessage ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, botConfig: { ...(settings.business.botConfig ?? { systemInstructions: "", tone: "amable y breve", fallbackMessage: "", humanHandoffMessage: "", active: true, welcomeMessage: "" }), welcomeMessage: e.target.value } } })} /></label>
              <label className={styles.fullField}><span>Reglas e instrucciones</span><textarea rows={5} value={settings.business.botConfig?.systemInstructions ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, botConfig: { ...(settings.business.botConfig ?? { tone: "amable y breve", welcomeMessage: "", fallbackMessage: "", humanHandoffMessage: "", active: true, systemInstructions: "" }), systemInstructions: e.target.value } } })} placeholder="Ejemplo: no confirmar disponibilidad sin revisar con recepción..." /></label>
              <label className={styles.fullField}><span>Cuando no sabe</span><textarea value={settings.business.botConfig?.fallbackMessage ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, botConfig: { ...(settings.business.botConfig ?? { systemInstructions: "", tone: "amable y breve", welcomeMessage: "", humanHandoffMessage: "", active: true, fallbackMessage: "" }), fallbackMessage: e.target.value } } })} /></label>
              <label className={styles.fullField}><span>Traspaso a humano</span><textarea value={settings.business.botConfig?.humanHandoffMessage ?? ""} onChange={(e) => setSettings({ business: { ...settings.business, botConfig: { ...(settings.business.botConfig ?? { systemInstructions: "", tone: "amable y breve", welcomeMessage: "", fallbackMessage: "", active: true, humanHandoffMessage: "" }), humanHandoffMessage: e.target.value } } })} /></label>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} onClick={() => void saveSettings()} disabled={busy}>
                {busy ? "Guardando…" : "Guardar configuración"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
