import Link from "next/link";
import { ProjectShell } from "./project-shell";
import type { ArtifactType,Project } from "@/lib/types";

export function ArtifactListPage({project,active,title,description,types}:{project:Project;active:string;title:string;description:string;types:ArtifactType[]}){
 const id=project.id,artifacts=project.artifacts.filter(a=>types.includes(a.type));
 return <ProjectShell id={id} active={active}><main className="page"><div className="eyebrow">Structured artifacts</div><h1>{title}</h1><p className="subtle">{description}</p><section className="sheet" style={{marginTop:24}}>{artifacts.map(a=><Link key={a.id} href={`/projects/${id}/blueprint?artifact=${a.id}`} className="issue"><span className="mono">{a.id}</span><span><strong>{a.title}</strong><br/><span className="subtle">v{a.version} · {a.status}</span></span></Link>)}</section></main></ProjectShell>
}
