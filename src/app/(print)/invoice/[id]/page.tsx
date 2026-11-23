"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuSend } from "react-icons/lu";
import { InvoiceView } from "@/components/invoice/invoice-view";
import { Button } from "@/components/ui";

/** Printable A4 invoice (English + Arabic). Opens in a new tab from Payments and member profiles. */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <InvoiceView
      url={`/api/payments/${id}`}
      extra={(d) =>
        d.payment.member?.id ? (
          <Link href={`/members/${d.payment.member.id}?send=${d.payment.id}`}>
            <Button variant="secondary">
              <LuSend className="h-4 w-4" /> Send to member
            </Button>
          </Link>
        ) : null
      }
    />
  );
}
