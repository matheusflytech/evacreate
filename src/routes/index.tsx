import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useStore, fmtDuration, fmtSize } from "@/lib/store";
import { Upload, Film, Download, Plus, ArrowRight, FolderKanban } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <div className="surface p-5 rounded-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
      </div>
      <div className="text-3xl font-display font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Dashboard() {
  const projects = useStore((s) => s.projects);
  const videos = useStore((s) => s.videos);
  const creatives = useStore((s) => s.creatives);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const uploadsMonth = videos.filter((v) => v.uploadedAt >= monthStart.getTime()).length;
  const pending = projects.filter((p) => p.status === "processando").length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos seus projetos, uploads e criativos gerados."
        actions={
          <Link
            to="/projetos"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" /> Novo projeto
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat icon={Upload} label="Uploads no mês" value={uploadsMonth} hint={`${videos.length} no total`} />
        <Stat icon={Film} label="Criativos gerados" value={creatives.length} hint="Em todos os projetos" />
        <Stat icon={Download} label="Exportações pendentes" value={pending} hint={pending ? "Em processamento" : "Nada na fila"} />
      </div>

      <div className="surface rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-display font-medium">Projetos recentes</h2>
          <Link to="/projetos" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-medium mb-1">Nenhum projeto ainda</h3>
            <p className="text-sm text-muted-foreground mb-5">Comece carregando um vídeo fonte para multiplicar seus criativos.</p>
            <Link
              to="/projetos"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" /> Criar projeto
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground font-mono">
                <th className="px-5 py-3 font-normal">Projeto</th>
                <th className="py-3 font-normal">Vídeos</th>
                <th className="py-3 font-normal">Criativos</th>
                <th className="py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 8).map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium">{p.name}</td>
                  <td className="py-3.5 text-muted-foreground">{p.videoIds.length}</td>
                  <td className="py-3.5 text-muted-foreground">{p.creativeIds.length}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-mono uppercase ${
                      p.status === "concluido" ? "bg-emerald-500/10 text-emerald-400" :
                      p.status === "processando" ? "bg-amber-500/10 text-amber-400" :
                      "bg-white/5 text-muted-foreground"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-muted-foreground font-mono">
                    {fmtSize(videos.filter(v => p.videoIds.includes(v.id)).reduce((a, v) => a + v.size, 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
