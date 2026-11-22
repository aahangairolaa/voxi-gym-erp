"use client";
import { useMemo, useRef, useState } from "react";
import { LuDownload, LuFileSpreadsheet, LuTriangleAlert, LuUpload } from "react-icons/lu";
import { Badge, Button, Field, Modal, Select, useToast } from "@/components/ui";
import { useBranches } from "@/hooks/use-lookups";
import { invalidate } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { parseCsv, toCsv } from "@/lib/csv";

/** VOXI field → header names we recognise (English & common Arabic) */
const FIELDS: { key: string; label: string; aliases: string[] }[] = [
  { key: "fullName", label: "Full name", aliases: ["name", "full name", "member", "member name", "الاسم"] },
  { key: "firstName", label: "First name", aliases: ["first name", "firstname", "first", "given name", "الاسم الأول"] },
  { key: "lastName", label: "Last name", aliases: ["last name", "lastname", "surname", "family name", "اسم العائلة"] },
  { key: "phone", label: "Mobile", aliases: ["phone", "mobile", "mobile number", "phone number", "whatsapp", "contact", "الجوال", "الهاتف"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "email address", "البريد"] },
  { key: "gender", label: "Gender", aliases: ["gender", "sex", "الجنس"] },
  { key: "dateOfBirth", label: "Date of birth", aliases: ["date of birth", "dob", "birthday", "birth date", "تاريخ الميلاد"] },
  { key: "qid", label: "QID", aliases: ["qid", "qatar id", "id number", "national id", "الرقم الشخصي"] },
  { key: "nationality", label: "Nationality", aliases: ["nationality", "country", "الجنسية"] },
  { key: "emergencyName", label: "Emergency contact", aliases: ["emergency contact", "emergency name"] },
  { key: "emergencyPhone", label: "Emergency phone", aliases: ["emergency phone", "emergency number"] },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "comments", "ملاحظات"] },
  { key: "plan", label: "Plan name", aliases: ["plan", "membership", "package", "plan name", "الباقة"] },
  { key: "startDate", label: "Start date", aliases: ["start date", "start", "joined", "from"] },
  { key: "endDate", label: "End date", aliases: ["end date", "expiry", "expiry date", "expires", "valid until", "end", "to", "تاريخ الانتهاء"] },
];
const norm = (s: string) => s.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");

type Result = { total: number; ready: number; withMembership: number; created: number; skipped: { row: number; name: string; reason: string }[] };

export function ImportMembersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const branches = useBranches();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [branchId, setBranchId] = useState("");
  const [preview, setPreview] = useState<Result | null>(null);
  const [done, setDone] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFileName(null);
    setTable([]);
    setMapping({});
    setPreview(null);
    setDone(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast("error", "Save your Excel sheet as CSV first (File → Save As → CSV), then upload it.");
      return;
    }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return toast("error", "That file has no member rows.");
    const headers = rows[0]!.map(norm);
    const m: Record<string, number> = {};
    for (const f of FIELDS) {
      const i = headers.findIndex((h) => h === norm(f.label) || f.aliases.includes(h));
      if (i >= 0) m[f.key] = i;
    }
    setFileName(file.name);
    setTable(rows);
    setMapping(m);
    setPreview(null);
    setDone(null);
  };

  const rows = useMemo(
    () =>
      table.slice(1).map((r) => Object.fromEntries(Object.entries(mapping).filter(([, i]) => i >= 0).map(([k, i]) => [k, (r[i] ?? "").trim()]))),
    [table, mapping],
  );

  const send = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const r = await api.post<Result>("/api/members/import", { rows, branchId: branchId || null, dryRun });
      if (dryRun) setPreview(r);
      else {
        setDone(r);
        invalidate("/api/members");
        toast("success", `${r.created} members imported`);
      }
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const template = () => {
    const csv = toCsv([
      ["First name", "Last name", "Mobile", "Email", "Gender", "Date of birth", "QID", "Nationality", "Plan name", "End date", "Notes"],
      ["Aisha", "Al-Khater", "+974 5512 3456", "aisha@example.com", "Female", "15/03/1994", "", "Qatari", "Monthly", "30/12/2026", ""],
      ["Rahul", "Menon", "6612 7788", "", "Male", "", "", "Indian", "", "", "Walk-in, no plan yet"],
    ]);
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "voxi-members-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasName = mapping.fullName !== undefined || mapping.firstName !== undefined;
  const hasPhone = mapping.phone !== undefined;
  const result = done ?? preview;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import members"
      description="Bring your existing members into VOXI from Excel or Google Sheets (saved as CSV)."
      footer={
        done ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            {table.length > 0 &&
              (preview ? (
                <Button onClick={() => send(false)} loading={busy} disabled={!preview.ready}>
                  <LuUpload className="h-4 w-4" /> Import {preview.ready} members
                </Button>
              ) : (
                <Button onClick={() => send(true)} loading={busy} disabled={!hasName || !hasPhone}>
                  Check file
                </Button>
              ))}
          </>
        )
      }
    >
      {table.length === 0 ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-6 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-500/5"
          >
            <LuFileSpreadsheet className="h-9 w-9 text-brand-500" />
            <span className="font-semibold text-ink">Choose a CSV file</span>
            <span className="text-xs text-muted">Needs at least a name and a mobile number per member. Up to 3,000 rows.</span>
          </button>
          <button type="button" onClick={template} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
            <LuDownload className="h-4 w-4" /> Download a template
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2/60 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-ink">
              <LuFileSpreadsheet className="h-4 w-4 text-brand-500" /> {fileName} · {table.length - 1} rows
            </span>
            {!done && (
              <button onClick={reset} className="text-xs font-semibold text-brand-600 hover:underline">
                Choose another file
              </button>
            )}
          </div>

          {!done && (
            <>
              <div>
                <p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-300">Match your columns</p>
                <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-soft">{f.label}</span>
                      <select
                        className="input h-9 w-44 py-0 text-sm"
                        value={mapping[f.key] ?? -1}
                        onChange={(e) => {
                          setMapping({ ...mapping, [f.key]: Number(e.target.value) });
                          setPreview(null);
                        }}
                      >
                        <option value={-1}>Not in file</option>
                        {table[0]!.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {(!hasName || !hasPhone) && <p className="mt-2 text-xs text-rose-600">Pick the columns for the member’s name and mobile number.</p>}
              </div>
              <Field label="Put everyone in branch">
                <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">My branch / no branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="green">{done ? `${done.created} imported` : `${result.ready} ready to import`}</Badge>
                {result.withMembership > 0 && <Badge tone="brand">{result.withMembership} with a current plan</Badge>}
                {result.skipped.length > 0 && <Badge tone="amber">{result.skipped.length} skipped</Badge>}
              </div>
              {result.skipped.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-line">
                  {result.skipped.slice(0, 200).map((s) => (
                    <p key={s.row} className="flex gap-2 border-b border-line/60 px-3 py-2 text-xs last:border-0">
                      <LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>
                        <b className="text-ink">Row {s.row}</b> {s.name}: <span className="text-muted">{s.reason}</span>
                      </span>
                    </p>
                  ))}
                </div>
              )}
              {!done && <p className="text-xs text-muted">Members with a plan and end date get that membership marked as already paid. Nothing is saved until you press Import.</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
