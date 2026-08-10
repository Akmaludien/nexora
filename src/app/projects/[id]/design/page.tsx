import { ProjectShell } from "@/components/project-shell";
import { DesignBridge } from "@/components/design-bridge";
import { getDesignContext } from "@/lib/design-context";
import { getAuthorizedProject } from "@/lib/page-data";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await getAuthorizedProject(id);
  const design = await getDesignContext(context.projectId);
  return (
    <ProjectShell id={id} active="design">
      <DesignBridge projectKey={id} initial={{ design }} />
    </ProjectShell>
  );
}