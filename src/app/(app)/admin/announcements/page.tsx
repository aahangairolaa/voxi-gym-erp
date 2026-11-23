"use client";
import { Announcements } from "@/components/admin/platform-tools";
import { PageHeader } from "@/components/ui";

export default function AdminAnnouncementsPage() {
  return (
    <>
      <PageHeader title="Announcements" subtitle="A banner every gym (or only trials / paying gyms) sees at the top of VOXI" />
      <div className="max-w-3xl">
        <Announcements />
      </div>
    </>
  );
}
