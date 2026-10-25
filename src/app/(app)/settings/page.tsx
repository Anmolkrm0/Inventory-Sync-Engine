import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage workspace preferences, sync frequencies, and team access."
      />
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-semibold text-ink">Coming soon</p>
        <p className="mt-1 text-sm text-muted">
          Workspace and account settings will be available in the upcoming release.
        </p>
      </Card>
    </div>
  );
}
