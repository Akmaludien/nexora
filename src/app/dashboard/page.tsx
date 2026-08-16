import Link from "next/link";
import { NewProjectForm } from "@/components/new-project-form";
import { calculateHealth } from "@/lib/intelligence";
import { listAuthorizedProjects } from "@/lib/page-data";
import { getProjectKnowledge } from "@/lib/project-repository";

export default async function Dashboard() {
  const { members } = await listAuthorizedProjects();
  return (
    <main className="dashboard">
      <div className="eyebrow">Projects</div>
      <h1>Product intelligence workspace</h1>
      <p className="subtle">Every view reads the same durable project knowledge.</p>
      {members.length === 0 && <section className="sheet" style={{ marginTop: 16 }}><h2 style={{ margin: 0 }}>You have no projects yet.</h2><p className="subtle">Create your first product blueprint below to turn an idea into a connected, traceable specification.</p></section>}
      {await Promise.all(members.map(async (member) => {
        const project = await getProjectKnowledge(member.project.key);
        if (!project) return null;
        const health = calculateHealth(project);
        return <article className="project-row" key={project.id}>
          <div><span className="badge green">{project.complexity} · {member.role}</span>
          <h2 style={{ marginTop: 12 }}>{project.name}</h2>
          <p className="subtle" style={{ margin: 0 }}>{project.description}</p></div>
          <div className="stats"><div className="stat"><strong>{health.overall}</strong><span>Spec health</span></div>
          <div className="stat"><strong>{project.artifacts.length}</strong><span>Artifacts</span></div>
          <div className="stat"><strong>{project.relationships.length}</strong><span>Relations</span></div></div>
          <Link className="btn btn-primary" href={`/projects/${project.id}/overview`}>Open project</Link>
        </article>;
      }))}
      <NewProjectForm />
    </main>
  );
}