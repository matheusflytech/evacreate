import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Film } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore, fmtDuration, fmtSize, typeLabel } from "@/lib/store";

export const Route = createFileRoute("/exportacoes")({ component: ExportsPage });

function ExportsPage() {
  const creatives = useStore((s) => s.creatives);

  return (
    <>
      <PageHeader title="Exportações" subtitle="Todos os criativos já exportados nesta sessão." />
      <div className="surface rounded-md overflow-hidden">
        {creatives.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
              <Film className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-medium mb-1">Nada exportado</h3>
            <p className="text-sm text-muted-foreground mb-5">Gere seu primeiro criativo para vê-lo aqui.</p>
            <Link to="/projetos" className="inline-flex h-10 items-center px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Criar criativos
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground font-mono">
                <th className="px-5 py-3 font-normal">Nome</th>
                <th className="py-3 font-normal">Tipo</th>
                <th className="py-3 font-normal">Duração</th>
                <th className="py-3 font-normal">Tamanho</th>
                <th className="py-3 font-normal">Fonte</th>
                <th className="py-3 font-normal">Data</th>
                <th className="px-5 py-3 font-normal text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {creatives.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-xs">{c.name}</td>
                  <td className="py-3"><span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">{typeLabel[c.type]}</span></td>
                  <td className="py-3 font-mono text-xs">{fmtDuration(c.duration)}</td>
                  <td className="py-3 font-mono text-xs">{fmtSize(c.size)}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground truncate max-w-[200px]">{c.sourceName}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 text-right">
                    <a href={c.blobUrl} download={c.name} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="w-3 h-3" /> Baixar
                    </a>
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
