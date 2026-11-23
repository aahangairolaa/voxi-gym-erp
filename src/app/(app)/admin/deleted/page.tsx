"use client";
import { DeletedGyms } from "@/components/admin/platform-tools";
import { PageHeader } from "@/components/ui";

export default function AdminDeletedPage() {
  return (
    <>
      <PageHeader title="Deleted gyms" subtitle="A plain record of gyms removed from VOXI. None of their data is kept." />
      <div className="max-w-3xl">
        <DeletedGyms />
      </div>
    </>
  );
}
