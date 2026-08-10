import { MemberManagement } from "@/components/member-management";
import { ProjectShell } from "@/components/project-shell";
import { getAuthorizedProject } from "@/lib/page-data";
import { listMembers } from "@/lib/project-repository";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await getAuthorizedProject(id);
  const members = await listMembers(context.projectId);
  const normalized = members.map((member) => ({ id: member.id, role: member.role, user: { email: member.user.email, displayName: member.user.displayName } }));
  return (
    <ProjectShell id={id} active="settings">
      <MemberManagement projectKey={id} isOwner={context.role === "OWNER"} currentUserEmail={context.email} initialMembers={normalized} />
    </ProjectShell>
  );
}