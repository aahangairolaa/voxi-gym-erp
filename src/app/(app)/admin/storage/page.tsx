"use client";
import { useAdminData } from "@/components/admin/gym-admin";
import { StorageCard } from "@/components/admin/platform-tools";
import { PageHeader } from "@/components/ui";

export default function AdminStoragePage() {
  const { gyms, storage } = useAdminData();
  return (
    <>
      <PageHeader title="Storage" subtitle="How much of the database each gym uses" />
      <StorageCard storage={storage.data} gyms={gyms.data?.gyms ?? []} />
    </>
  );
}
