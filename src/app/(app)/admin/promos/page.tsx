"use client";
import { PromoCodes } from "@/components/admin/gym-admin";
import { PageHeader } from "@/components/ui";

export default function AdminPromosPage() {
  return (
    <>
      <PageHeader title="Promo codes" subtitle="Discounts gyms can enter on their Billing page" />
      <PromoCodes />
    </>
  );
}
