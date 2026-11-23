"use client";
import { useState } from "react";
import { LuDownload, LuPrinter } from "react-icons/lu";
import { Button, Skeleton, useToast } from "@/components/ui";
import { useApi } from "@/hooks/use-api";
import { downloadBlob, invoicePdf } from "@/lib/docs/render";
import type { InvoiceData } from "@/lib/docs/invoice-model";
import { InvoiceDocument } from "./invoice-document";

/** Invoice page body with Print and Download PDF, for staff (/invoice/:id) and members (/r/:token). */
export function InvoiceView({ url, extra }: { url: string; extra?: (data: InvoiceData) => React.ReactNode }) {
  const { data, error } = useApi<InvoiceData>(url);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (error) return <p className="p-10 text-center text-muted">{error}</p>;
  if (!data) return <Skeleton className="mx-auto mt-10 h-[600px] max-w-3xl" />;

  const download = async () => {
    setBusy(true);
    try {
      downloadBlob(await invoicePdf(data), `${data.payment.invoiceNo}.pdf`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Couldn't create the PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-2 px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap justify-end gap-2">
        {extra?.(data)}
        <Button variant="secondary" onClick={() => window.print()}>
          <LuPrinter className="h-4 w-4" /> Print
        </Button>
        <Button onClick={download} loading={busy}>
          <LuDownload className="h-4 w-4" /> Download PDF
        </Button>
      </div>
      <InvoiceDocument data={data} />
    </div>
  );
}
