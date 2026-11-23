"use client";
import { useParams } from "next/navigation";
import { InvoiceView } from "@/components/invoice/invoice-view";

/** An invoice a gym shared with a member (WhatsApp / email link). No sign-in needed. */
export default function SharedInvoicePage() {
  const { token } = useParams<{ token: string }>();
  return <InvoiceView url={`/api/public/invoice/${encodeURIComponent(token)}`} />;
}
