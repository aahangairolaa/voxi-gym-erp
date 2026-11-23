"use client";
import { useRef, useState } from "react";
import { LuDownload, LuFileSpreadsheet, LuTriangleAlert, LuUpload } from "react-icons/lu";
import { Button, Modal, useToast } from "@/components/ui";
import { invalidate } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { parseCsv, toCsv } from "@/lib/csv";
import { SOURCE_SHORT, SOURCES } from "@/lib/sources";

type Row = { name: string; phone: string; email: string; source: string; interest: string; notes: string };
type Check = { ready: number; skipped: { row: number; name: string; reason: string }[]; imported: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** Header names people use in their sheets for each field */
const ALIASES: Record<keyof Row, string[]> = {
  name: ["name", "fullname", "leadname", "client", "customer"],
  phone: ["phone", "mobile", "number", "phonenumber", "mobilenumber", "whatsapp", "contact"],
  email: ["email", "emailaddress", "mail"],
  source: ["source", "leadsource", "channel", "from", "howtheyfoundus"],
  interest: ["interest", "plan", "interestedin", "goal"],
  notes: ["notes", "note", "comments", "remarks"],
};

/** Import leads from a CSV saved from Excel or Google Sheets. Checks first, then imports. */
export function ImportLeadsModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows(null);
    setFileName("");
    setCheck(null);
  };

  const template = () => {
    const csv = toCsv([
      ["Name", "Phone", "Email", "Source", "Interest", "Notes"],
      ["James Carter", "+974 5512 3456", "james@example.com", "WhatsApp", "Annual plan", "Asked about PT"],
      ["Olivia Bennett", "5598 7654", "", "Walk-in", "3 months", ""],
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "voxi-leads-template.csv";
    a.click();
  };

  const load = async (file?: File) => {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      toast("error", "Save your Excel sheet as CSV first (File → Save As → CSV), then upload it.");
      return;
    }
    const table = parseCsv(await file.text());
    if (table.length < 2) return toast("error", "That file has no lead rows.");
    const headers = table[0]!.map(norm);
    const col = (k: keyof Row) => headers.findIndex((h) => ALIASES[k].includes(h));
    const idx = { name: col("name"), phone: col("phone"), email: col("email"), source: col("source"), interest: col("interest"), notes: col("notes") };
    if (idx.name < 0 || idx.phone < 0) return toast("error", "The file needs a Name and a Phone column. Download the template to see the format.");
    const parsed = table
      .slice(1)
      .filter((r) => r.some((c) => c.trim()))
      .map((r) => {
        const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
        return { name: get(idx.name), phone: get(idx.phone), email: get(idx.email), source: get(idx.source), interest: get(idx.interest), notes: get(idx.notes) };
      });
    setFileName(file.name);
    setRows(parsed);
    setBusy(true);
    try {
      setCheck(await api.post<Check>("/api/leads/import", { rows: parsed, commit: false }));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't read the file");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api.post<Check>("/api/leads/import", { rows, commit: true });
      invalidate("/api/leads");
      toast("success", `Imported ${r.imported} lead${r.imported === 1 ? "" : "s"}`);
      reset();
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import leads"
      description="Bring in enquiries from a spreadsheet: Excel, Google Sheets or a Meta lead form export, saved as CSV."
      footer={
        check && check.ready > 0 ? (
          <Button onClick={commit} loading={busy}>
            Import {check.ready} lead{check.ready === 1 ? "" : "s"}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-2/70 p-4 text-sm text-ink-soft">
          <p>
            Columns: <b>Name</b> and <b>Phone</b> (required), plus Email, Source, Interest and Notes. Source can be{" "}
            {SOURCES.slice(0, 6).map((s) => SOURCE_SHORT[s]).join(", ")} and more. Numbers without a country code are taken as Qatar (+974).
          </p>
          <button type="button" onClick={template} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline dark:text-brand-300">
            <LuDownload className="h-4 w-4" /> Download the template
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center transition hover:border-brand-300"
        >
          {fileName ? <LuFileSpreadsheet className="h-7 w-7 text-brand-600" /> : <LuUpload className="h-7 w-7 text-muted" />}
          <span className="text-sm font-semibold text-ink">{fileName || "Choose a CSV file"}</span>
          <span className="text-xs text-muted">{busy ? "Checking…" : rows ? `${rows.length} rows found` : "Up to 2,000 leads at a time"}</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} />

        {check && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">
              {check.ready} ready to import{check.skipped.length ? `, ${check.skipped.length} will be skipped` : ""}.
            </p>
            {check.skipped.length > 0 && (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                {check.skipped.map((s) => (
                  <li key={s.row} className="flex gap-2 text-ink-soft">
                    <LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      Row {s.row}
                      {s.name ? ` (${s.name})` : ""}: {s.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
