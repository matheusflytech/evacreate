import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload as UploadIcon, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore, fmtDuration, fmtSize } from "@/lib/store";

export const Route = createFileRoute("/uploads")({ component: UploadsPage });

function UploadsPage() {
  const videos = useStore((s) => s.videos);
  const projects = useStore((s) => s.projects);
  const removeVideo = useStore((s) => s.removeVideo);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Uploads" subtitle="Todos os vídeos fonte enviados em todos os projetos." />
      <div className="surface rounded-md overflow-hidden">
        {videos.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
              <UploadIcon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-medium mb-1">Nenhum upload</h3>
            <p className="text-sm text-muted-foreground mb-5">Comece um projeto para enviar seu primeiro vídeo.</p>
            <Link to="/projetos" className="inline-flex h-10 items-center px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Ir para Projetos
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground font-mono">
                <th className="px-5 py-3 font-normal">Nome</th>
                <th className="py-3 font-normal">Duração</th>
                <th className="py-3 font-normal">Tamanho</th>
                <th className="py-3 font-normal">Projeto</th>
                <th className="py-3 font-normal">Enviado</th>
                <th className="px-5 py-3 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-white/[0.02]">
                  <td className="px-5 py-3 flex items-center gap-3">
                    <img src={v.thumbnail} alt="" className="w-16 h-9 object-cover rounded border border-border" />
                    <span className="font-mono text-xs">{v.name}</span>
                  </td>
                  <td className="py-3 font-mono text-xs">{fmtDuration(v.duration)}</td>
                  <td className="py-3 font-mono text-xs">{fmtSize(v.size)}</td>
                  <td className="py-3 text-muted-foreground">{projectName(v.projectId)}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{new Date(v.uploadedAt).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => removeVideo(v.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
