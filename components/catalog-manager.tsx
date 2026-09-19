"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/catalog/catalog.module.css";

type Business = { id: string; name: string; country: string | null };
type Mapping = Record<string, string | undefined>;
type Preview = {
  importId: string;
  filename: string;
  fileType: string;
  totalRows: number;
  headers: string[];
  suggestedMapping: Mapping;
  previewRows: Record<string, unknown>[];
  warnings: string[];
  duplicateRows: number[];
  validationErrors: Array<{ row: number; reason: string }>;
  existingMatches: Array<{ id: string; name: string; sku: string | null; externalCode: string | null }>;
};
type ImportResult = {
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  deactivated: number;
};
type ImportHistory = {
  id: string;
  filename: string;
  status: string;
  mode: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  unchangedRows: number;
  rejectedRows: number;
  createdAt: string;
};

const fields = [
  ["externalCode", "Código externo"],
  ["sku", "SKU"],
  ["name", "Nombre *"],
  ["category", "Categoría"],
  ["description", "Descripción"],
  ["price", "Precio"],
  ["stock", "Existencia"],
  ["presentation", "Presentación"],
  ["unit", "Unidad"],
  ["requiresPrescription", "Requiere receta"],
  ["serviceType", "Tipo de servicio / habitación"],
  ["location", "Ubicación / destino"],
  ["duration", "Duración"],
  ["capacity", "Capacidad de personas"],
  ["checkInTime", "Hora de check-in"],
  ["checkOutTime", "Hora de check-out"],
  ["includes", "Qué incluye"],
  ["amenities", "Comodidades / amenidades"],
  ["availabilityNote", "Nota de disponibilidad"],
  ["reservationRequired", "Requiere reserva"],
  ["cancellationPolicy", "Política de cancelación"],
] as const;

export default function CatalogManager() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [mode, setMode] = useState<"update" | "replace">("update");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectingBusiness, setSelectingBusiness] = useState(false);
  const [message, setMessage] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [botAnswer, setBotAnswer] = useState("");
  const [testingAnswer, setTestingAnswer] = useState(false);

  useEffect(() => {
    fetch("/api/catalog/businesses")
      .then((response) => response.json())
      .then((data) => {
        const list = data.businesses ?? [];
        setBusinesses(list);
        if (list.length === 1) void selectBusiness(list[0].id);
      })
      .catch(() => setMessage("No se pudieron cargar las empresas."));
  }, []);

  useEffect(() => {
    if (!businessId) {
      setHistory([]);
      return;
    }
    fetch(`/api/catalog/history?businessId=${encodeURIComponent(businessId)}`)
      .then((response) => response.json())
      .then((data) => setHistory(data.imports ?? []))
      .catch(() => setHistory([]));
  }, [businessId, result]);

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === businessId),
    [businesses, businessId],
  );

  async function selectBusiness(nextBusinessId: string) {
    if (!nextBusinessId) {
      setBusinessId("");
      setPreview(null);
      setResult(null);
      setFile(null);
      setHistory([]);
      return;
    }

    setSelectingBusiness(true);
    setMessage("");
    try {
      const response = await fetch("/api/catalog/business/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId: nextBusinessId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo seleccionar la empresa.");

      setBusinessId(nextBusinessId);
      setPreview(null);
      setResult(null);
      setFile(null);
      setReplaceConfirmed(false);
      setTestQuery("");
      setBotAnswer("");
      setMessage(`Empresa activa: ${data.business.name}`);
    } catch (error) {
      setBusinessId("");
      setHistory([]);
      setMessage(error instanceof Error ? error.message : "No se pudo seleccionar la empresa.");
    } finally {
      setSelectingBusiness(false);
    }
  }

  async function testCatalogAnswer() {
    if (!businessId || !testQuery.trim()) {
      setMessage("Seleccioná una empresa y escribí una consulta para probar el catálogo.");
      return;
    }

    setTestingAnswer(true);
    setBotAnswer("");
    try {
      const response = await fetch("/api/catalog/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, query: testQuery }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo probar la respuesta.");
      setBotAnswer(data.reply ?? "");
    } catch (error) {
      setBotAnswer(error instanceof Error ? error.message : "No se pudo probar la respuesta.");
    } finally {
      setTestingAnswer(false);
    }
  }

  async function analyze() {
    if (!businessId || !file) {
      setMessage("Seleccioná una empresa y un archivo CSV o XLSX.");
      return;
    }
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const form = new FormData();
      form.set("businessId", businessId);
      form.set("file", file);
      const response = await fetch("/api/catalog/preview", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo analizar el archivo.");
      setPreview(data);
      setMapping(data.suggestedMapping ?? {});
      setMessage("Archivo analizado. Revisá el mapeo antes de aprobar.");
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "No se pudo analizar.");
    } finally {
      setBusy(false);
    }
  }

  async function approveImport() {
    if (!preview || !file || !businessId) return;
    if (!mapping.name || (!mapping.sku && !mapping.externalCode)) {
      setMessage("Mapeá Nombre y al menos SKU o Código externo.");
      return;
    }
    if (mode === "replace" && !replaceConfirmed) {
      setMessage("Confirmá explícitamente el modo Reemplazar catálogo.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("businessId", businessId);
      form.set("importId", preview.importId);
      form.set("mapping", JSON.stringify(mapping));
      form.set("mode", mode);
      form.set("approved", "true");
      form.set("file", file);

      const response = await fetch("/api/catalog/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo importar.");
      setResult(data.summary);
      setPreview(null);
      setFile(null);
      setMapping({});
      setReplaceConfirmed(false);
      setMessage("Importación completada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo importar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.stackLarge}>
      <section className={styles.card}>
        <h2>Importar catálogo</h2>
        <div className={styles.stack}>
          <label className={styles.field}>
            <span>Empresa</span>
            <select
              value={businessId}
              disabled={selectingBusiness || busy}
              onChange={(event) => void selectBusiness(event.target.value)}
            >
              <option value="">Seleccionar empresa</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}{business.country ? ` · ${business.country}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Archivo</span>
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
              }}
            />
          </label>

          <button className={styles.primaryButton} type="button" onClick={analyze} disabled={busy}>
            {busy ? "Procesando…" : selectingBusiness ? "Seleccionando empresa…" : "Analizar archivo"}
          </button>
        </div>
        {selectedBusiness ? (
          <p className={styles.help}>
            Catálogo aislado para <strong>{selectedBusiness.name}</strong>. No se aplicará símbolo de moneda.
          </p>
        ) : null}
      </section>

      {message ? <div className={styles.notice}>{message}</div> : null}

      {preview ? (
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>REVISIÓN OBLIGATORIA</div>
              <h2>{preview.filename}</h2>
            </div>
            <span className={styles.badge}>{preview.totalRows} registros</span>
          </div>

          {preview.warnings.length ? (
            <div className={styles.warningBox}>
              {preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}

          {preview.duplicateRows.length ? (
            <div className={styles.warningBox}>
              Posibles duplicados dentro del archivo en filas: {preview.duplicateRows.join(", ")}
            </div>
          ) : null}

          {preview.validationErrors?.length ? (
            <div className={styles.warningBox}>
              <strong>Errores detectados en la revisión:</strong>
              {preview.validationErrors.map((item) => (
                <p key={`${item.row}-${item.reason}`}>Fila {item.row}: {item.reason}</p>
              ))}
            </div>
          ) : null}

          {preview.existingMatches?.length ? (
            <div className={styles.warningBox}>
              <strong>Productos que ya podrían existir en esta empresa:</strong>
              {preview.existingMatches.map((item) => (
                <p key={item.id}>{item.name} · {item.sku ?? item.externalCode ?? "sin código"}</p>
              ))}
            </div>
          ) : null}

          <h3>Mapeo de columnas</h3>
          <div className={styles.mappingGrid}>
            {fields.map(([field, label]) => (
              <label className={styles.field} key={field}>
                <span>{label}</span>
                <select
                  value={mapping[field] ?? ""}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field]: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">No importar</option>
                  {preview.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h3>Vista previa</h3>
          <div className={styles.previewList}>
            {preview.previewRows.map((row, index) => (
              <article key={index} className={styles.previewRow}>
                <strong>Fila {index + 2}</strong>
                {preview.headers.slice(0, 8).map((header) => (
                  <div key={header}>
                    <span>{header}</span>
                    <b>{String(row[header] ?? "—")}</b>
                  </div>
                ))}
              </article>
            ))}
          </div>

          <h3>Modo de importación</h3>
          <div className={styles.modeGrid}>
            <label className={styles.choice}>
              <input type="radio" checked={mode === "update"} onChange={() => setMode("update")} />
              <span><strong>Actualizar catálogo</strong><small>Crea y actualiza. No desactiva ausentes.</small></span>
            </label>
            <label className={styles.choice}>
              <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
              <span><strong>Reemplazar catálogo</strong><small>Puede desactivar productos anteriores que no estén en el archivo.</small></span>
            </label>
          </div>

          {mode === "replace" ? (
            <label className={styles.confirm}>
              <input
                type="checkbox"
                checked={replaceConfirmed}
                onChange={(event) => setReplaceConfirmed(event.target.checked)}
              />
              Confirmo que quiero reemplazar el catálogo. Los productos ausentes se desactivarán, no se borrarán.
            </label>
          ) : null}

          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={() => {
              setPreview(null);
              setMapping({});
            }} disabled={busy}>
              Cancelar
            </button>
            <button className={styles.primaryButton} type="button" onClick={approveImport} disabled={busy}>
              {busy ? "Importando…" : "Aprobar importación"}
            </button>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className={styles.card}>
          <div className={styles.kicker}>RESULTADO</div>
          <h2>Importación completada</h2>
          <div className={styles.metrics}>
            <div><strong>{result.processed}</strong><span>Procesados</span></div>
            <div><strong>{result.created}</strong><span>Nuevos</span></div>
            <div><strong>{result.updated}</strong><span>Actualizados</span></div>
            <div><strong>{result.unchanged}</strong><span>Sin cambios</span></div>
            <div><strong>{result.rejected}</strong><span>Rechazados</span></div>
            <div><strong>{result.deactivated}</strong><span>Desactivados</span></div>
          </div>
        </section>
      ) : null}

      <section className={styles.card}>
        <div className={styles.kicker}>PRUEBA DEL CATÁLOGO</div>
        <h2>Probar respuesta del bot</h2>
        <p className={styles.muted}>
          Consultá por nombre, código o categoría. La respuesta usa únicamente información almacenada y no agrega moneda.
        </p>
        <div className={styles.stack}>
          <label className={styles.field}>
            <span>Consulta</span>
            <input
              value={testQuery}
              onChange={(event) => setTestQuery(event.target.value)}
              placeholder="Ejemplo: habitación doble para 2 personas"
              disabled={!businessId || testingAnswer}
            />
          </label>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={testCatalogAnswer}
            disabled={!businessId || testingAnswer || !testQuery.trim()}
          >
            {testingAnswer ? "Consultando…" : "Probar respuesta"}
          </button>
        </div>
        {botAnswer ? <pre className={styles.botAnswer}>{botAnswer}</pre> : null}
      </section>

      <section className={styles.card}>
        <h2>Historial</h2>
        {!businessId ? <p className={styles.muted}>Seleccioná una empresa.</p> : null}
        {businessId && !history.length ? <p className={styles.muted}>Todavía no hay importaciones.</p> : null}
        <div className={styles.historyList}>
          {history.map((item) => (
            <article key={item.id} className={styles.historyItem}>
              <div>
                <strong>{item.filename}</strong>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <span className={styles.badge}>{item.status}</span>
              <p>
                {item.importedRows} nuevos · {item.updatedRows} actualizados · {item.unchangedRows} sin cambios · {item.rejectedRows} rechazados
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
