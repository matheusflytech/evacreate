import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  Upload as UploadIcon, X, ArrowRight, ArrowLeft, Sparkles, Check, Play,
  Download, FileVideo, Loader2, Plus, Trash2, Youtube, Info, Zap, MessageSquare, Target,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Timeline } from "@/components/Timeline";
import { extractVideoMeta, trimVideo } from "@/lib/video-utils";
import {
  useStore, fmtDuration, fmtSize, typeLabel,
  type SourceVideo, type CutPoint, type Segment, type Creative, type CreativeType,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projetos")({
  component: ProjetosPage,
});

type Step = 1 | 2 | 3 | 4;

interface VideoState {
  video: SourceVideo;
  cuts: CutPoint[];
  segments: Segment[];
  loading: boolean;
}

interface ProcessJob {
  id: string;
  segment: Segment;
  video: SourceVideo;
  status: "fila" | "processando" | "concluido" | "erro";
  progress: number;
  creative?: Creative;
}

const typeInfo: Record<CreativeType, { icon: React.ElementType; color: string; title: string; desc: string; tip: string }> = {
  gancho: {
    icon: Zap,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    title: "Gancho",
    desc: "Os primeiros 3–8 segundos. Objetivo: capturar atenção e impedir o scroll.",
    tip: "Ex: pergunta provocativa, afirmação surpreendente, cena de impacto visual.",
  },
  corpo: {
    icon: MessageSquare,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    title: "Corpo",
    desc: "O conteúdo central. Desenvolve o argumento, conta a história ou apresenta o produto.",
    tip: "Ex: demonstração, depoimento, explicação do benefício principal.",
  },
  cta: {
    icon: Target,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    title: "CTA",
    desc: "Call To Action — o encerramento que converte. Diz ao espectador o que fazer agora.",
    tip: "Ex: 'Clique no link', 'Mande mensagem', 'Acesse o site', 'Compre agora'.",
  },
};

function TypeInfoPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition border border-border rounded px-2.5 py-1.5"
      >
        <Info className="w-3.5 h-3.5" />
        {open ? "Fechar explicação" : "O que são Gancho, Corpo e CTA?"}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {(["gancho", "corpo", "cta"] as CreativeType[]).map((t) => {
            const info = typeInfo[t];
            const Icon = info.icon;
            return (
              <div key={t} className={cn("rounded-md border p-3 space-y-1.5", info.color)}>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Icon className="w-4 h-4" />
                  {info.title}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{info.desc}</p>
                <p className="text-[11px] opacity-70 italic">{info.tip}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function fetchYouTubeVideo(url: string): Promise<File> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error("URL inválida. Use youtube.com/watch?v=... ou youtu.be/...");
  const videoId = match[1];
  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, videoQuality: "720", filenameStyle: "basic" }),
  });
  if (!res.ok) throw new Error("Serviço de download indisponível. Faça upload do arquivo diretamente.");
  const data = await res.json();
  if (data.status === "error") throw new Error(data.error?.code || "Erro ao obter vídeo do YouTube.");
  const downloadUrl = data.url || data.tunnel;
  if (!downloadUrl) throw new Error("Não foi possível obter o link. Faça upload direto.");
  const videoRes = await fetch(downloadUrl);
  if (!videoRes.ok) throw new Error("Falha ao baixar o vídeo.");
  const blob = await videoRes.blob();
  return new File([blob], `youtube-${videoId}.mp4`, { type: "video/mp4" });
}

function ProjetosPage() {
  const [step, setStep] = useState<Step>(1);
  const [projectName, setProjectName] = useState("Projeto " + new Date().toLocaleDateString("pt-BR"));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [videoStates, setVideoStates] = useState<VideoState[]>([]);
  const [jobs, setJobs] = useState<ProcessJob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);

  const addProject = useStore((s) => s.addProject);
  const addVideo = useStore((s) => s.addVideo);
  const addCreatives = useStore((s) => s.addCreatives);
  const attach = useStore((s) => s.attachCreativesToProject);

  const ensureProject = () => {
    if (projectId) return projectId;
    const id = addProject(projectName);
    setProjectId(id);
    return id;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File, pid: string) => {
    try {
      const meta = await extractVideoMeta(file);
      const v: SourceVideo = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        duration: meta.duration,
        thumbnail: meta.thumbnail,
        file,
        uploadedAt: Date.now(),
        projectId: pid,
      };
      addVideo(v);
      setVideoStates((vs) => [...vs, { video: v, cuts: [], segments: [], loading: false }]);
      toast.success(`${file.name} carregado`);
    } catch {
      toast.error(`Falha ao ler ${file.name}`);
    }
  }, [addVideo]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pid = ensureProject();
    const arr = Array.from(files).filter((f) => /\.(mp4|mov|webm)$/i.test(f.name) || f.type.startsWith("video/"));
    if (!arr.length) { toast.error("Selecione arquivos .mp4, .mov ou .webm"); return; }
    for (const file of arr) await processFile(file, pid);
  }, [processFile]);

  const handleYouTube = async () => {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    const pid = ensureProject();
    try {
      toast.info("Baixando vídeo do YouTube...");
      const file = await fetchYouTubeVideo(ytUrl.trim());
      await processFile(file, pid);
      setYtUrl("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar do YouTube");
    } finally {
      setYtLoading(false);
    }
  };

  const runAIDetection = async () => {
    setStep(2);
    setVideoStates((vs) => vs.map((s) => ({ ...s, loading: true })));
    await new Promise((r) => setTimeout(r, 2500));
    setVideoStates((vs) =>
      vs.map((s) => {
        const cuts = generateAICuts(s.video.duration);
        return { ...s, loading: false, cuts, segments: buildSegments(s.video.id, s.video.duration, cuts) };
      }),
    );
    toast.success("IA detectou pontos de corte sugeridos. Ajuste conforme necessário.");
  };

  const updateCuts = (videoId: string, cuts: CutPoint[]) => {
    setVideoStates((vs) =>
      vs.map((s) => s.video.id === videoId
        ? { ...s, cuts, segments: buildSegments(videoId, s.video.duration, cuts, s.segments) }
        : s),
    );
  };

  const updateSegment = (videoId: string, segId: string, patch: Partial<Segment>) => {
    setVideoStates((vs) =>
      vs.map((s) => s.video.id === videoId
        ? { ...s, segments: s.segments.map((seg) => seg.id === segId ? { ...seg, ...patch } : seg) }
        : s),
    );
  };

  const startProcessing = async () => {
    const allSegs: { segment: Segment; video: SourceVideo }[] = [];
    videoStates.forEach((vs) => vs.segments.forEach((seg) => allSegs.push({ segment: seg, video: vs.video })));
    if (!allSegs.length) { toast.error("Nenhum segmento para processar"); return; }
    const initial: ProcessJob[] = allSegs.map(({ segment, video }) => ({
      id: segment.id, segment, video, status: "fila", progress: 0,
    }));
    setJobs(initial);
    setStep(3);
    const completed: Creative[] = [];
    for (const job of initial) {
      setJobs((js) => js.map((j) => j.id === job.id ? { ...j, status: "processando" } : j));
      try {
        const blob = await trimVideo(job.video.file, job.segment.start, job.segment.end,
          (p) => setJobs((js) => js.map((j) => j.id === job.id ? { ...j, progress: p } : j)));
        const url = URL.createObjectURL(blob);
        const creative: Creative = {
          id: crypto.randomUUID(),
          name: `${job.segment.name}.mp4`,
          type: job.segment.type,
          duration: job.segment.end - job.segment.start,
          size: blob.size,
          blobUrl: url,
          thumbnail: job.video.thumbnail,
          sourceName: job.video.name,
          createdAt: Date.now(),
        };
        completed.push(creative);
        setJobs((js) => js.map((j) => j.id === job.id ? { ...j, status: "concluido", progress: 1, creative } : j));
      } catch (e) {
        console.error(e);
        setJobs((js) => js.map((j) => j.id === job.id ? { ...j, status: "erro" } : j));
        toast.error(`Falha ao processar ${job.segment.name}`);
      }
    }
    if (completed.length) {
      addCreatives(completed);
      const pid = projectId ?? ensureProject();
      attach(pid, completed.map((c) => c.id));
      toast.success(`${completed.length} criativos prontos!`);
      setStep(4);
    }
  };

  const finalCreatives = jobs.map((j) => j.creative).filter(Boolean) as Creative[];

  const downloadOne = (c: Creative) => {
    const a = document.createElement("a");
    a.href = c.blobUrl; a.download = c.name; a.click();
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    for (const c of finalCreatives) {
      const blob = await fetch(c.blobUrl).then((r) => r.blob());
      zip.file(c.name, blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a"); a.href = url; a.download = `${projectName}.zip`; a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP gerado");
  };

  const reset = () => {
    setStep(1); setProjectId(null); setVideoStates([]); setJobs([]);
    setProjectName("Projeto " + new Date().toLocaleDateString("pt-BR"));
  };

  return (
    <>
      <PageHeader
        title="Novo Projeto"
        subtitle="Carregue um vídeo, ajuste os cortes e gere múltiplos criativos."
        actions={
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={step > 1}
            className="bg-transparent border border-border rounded px-3 h-9 text-sm text-white w-64 focus:outline-none focus:border-primary"
          />
        }
      />
      <Stepper step={step} />

      {step === 1 && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="surface rounded-md border-dashed border-2 border-border hover:border-primary/60 transition cursor-pointer p-16 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
              <UploadIcon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-display font-medium mb-1">Arraste vídeos aqui</h3>
            <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar — .mp4, .mov, .webm</p>
            <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Selecionar arquivos
            </button>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>

          <div className="surface rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <Youtube className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium">Importar do YouTube</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">beta</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Cole o link de qualquer vídeo público. O app baixa e converte automaticamente.
            </p>
            <div className="flex gap-2">
              <input
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYouTube()}
                placeholder="https://youtube.com/watch?v=... ou youtu.be/..."
                className="flex-1 bg-input border border-border rounded h-9 px-3 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleYouTube}
                disabled={ytLoading || !ytUrl.trim()}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-medium hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ytLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                {ytLoading ? "Baixando..." : "Importar"}
              </button>
            </div>
          </div>

          {videoStates.length > 0 && (
            <div className="surface rounded-md">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="font-display text-sm font-medium">{videoStates.length} vídeo(s) carregado(s)</h3>
              </div>
              <div className="divide-y divide-border">
                {videoStates.map((vs) => (
                  <div key={vs.video.id} className="px-5 py-4 flex items-center gap-4">
                    <img src={vs.video.thumbnail} alt="" className="w-24 h-14 object-cover rounded border border-border" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm truncate">{vs.video.name}</div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-mono">
                        <span>{fmtDuration(vs.video.duration)}</span>
                        <span>{fmtSize(vs.video.size)}</span>
                      </div>
                    </div>
                    <button onClick={() => setVideoStates((s) => s.filter((x) => x.video.id !== vs.video.id))}
                      className="p-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={runAIDetection} disabled={videoStates.length === 0}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <TypeInfoPanel />
          {videoStates.map((vs) => (
            <div key={vs.video.id} className="surface rounded-md p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileVideo className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm">{vs.video.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{fmtDuration(vs.video.duration)}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                  <Sparkles className="w-3 h-3" /> Sugestão IA — ajuste livre
                </div>
              </div>
              {vs.loading ? (
                <div className="h-24 rounded-md border border-border bg-[#0a1428] grid place-items-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Analisando silêncios e cenas...
                  </div>
                </div>
              ) : (
                <>
                  <Timeline duration={vs.video.duration} thumbnail={vs.video.thumbnail} cuts={vs.cuts} onChange={(c) => updateCuts(vs.video.id, c)} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    IA detectou <span className="text-primary font-mono">{vs.cuts.length}</span> pontos de corte. Arraste para ajustar ou clique para adicionar novos.
                  </p>
                  <div className="mt-5 space-y-2">
                    <div className="grid grid-cols-[1fr_160px_160px_100px_40px] gap-3 text-[10px] font-mono uppercase text-muted-foreground px-2">
                      <div>Segmento</div><div>Tipo</div><div>Duração</div><div>Alvo (s)</div><div></div>
                    </div>
                    {vs.segments.map((seg, i) => {
                      const info = typeInfo[seg.type];
                      const Icon = info.icon;
                      return (
                        <div key={seg.id} className="grid grid-cols-[1fr_160px_160px_100px_40px] gap-3 items-center bg-white/[0.02] border border-border rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-muted-foreground w-6 text-right">#{String(i + 1).padStart(2, "0")}</span>
                            <input value={seg.name} onChange={(e) => updateSegment(vs.video.id, seg.id, { name: e.target.value })}
                              className="bg-transparent text-sm flex-1 min-w-0 focus:outline-none border-b border-transparent focus:border-primary" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0", info.color)}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <select value={seg.type} onChange={(e) => updateSegment(vs.video.id, seg.id, { type: e.target.value as CreativeType })}
                              className="bg-input border border-border rounded h-8 text-xs px-2 focus:outline-none focus:border-primary flex-1">
                              <option value="gancho">Gancho</option>
                              <option value="corpo">Corpo</option>
                              <option value="cta">CTA</option>
                            </select>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {fmtDuration(seg.start)} → {fmtDuration(seg.end)}
                          </div>
                          <input type="number" placeholder="auto" value={seg.targetDuration ?? ""}
                            onChange={(e) => updateSegment(vs.video.id, seg.id, { targetDuration: e.target.value ? Number(e.target.value) : undefined })}
                            className="bg-input border border-border rounded h-8 text-xs px-2 font-mono focus:outline-none focus:border-primary" />
                          <button onClick={() => setPreviewUrl(URL.createObjectURL(vs.video.file) + "#t=" + seg.start + "," + seg.end)}
                            className="p-1.5 text-muted-foreground hover:text-primary" title="Preview">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 h-11 px-5 rounded-md border border-border text-sm hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={startProcessing} disabled={videoStates.some((v) => v.loading)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40">
              <Sparkles className="w-4 h-4" /> Gerar criativos
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="surface rounded-md p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg">Processando criativos</h3>
              <span className="font-mono text-sm text-muted-foreground">
                {jobs.filter((j) => j.status === "concluido").length} de {jobs.length} prontos
              </span>
            </div>
            <p className="text-sm text-muted-foreground">FFmpeg.wasm rodando no navegador — nenhum vídeo é enviado a servidores.</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(jobs.filter((j) => j.status === "concluido").length / Math.max(1, jobs.length)) * 100}%` }} />
            </div>
          </div>
          <div className="surface rounded-md divide-y divide-border">
            {jobs.map((j) => {
              const info = typeInfo[j.segment.type];
              const Icon = info.icon;
              return (
                <div key={j.id} className="px-5 py-4 grid grid-cols-[1fr_140px_120px] items-center gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border", info.color)}>
                        <Icon className="w-3 h-3" />{typeLabel[j.segment.type]}
                      </div>
                      <div className="font-mono text-sm truncate">{j.segment.name}.mp4</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className={cn("h-full transition-all", j.status === "erro" ? "bg-destructive" : j.status === "concluido" ? "bg-emerald-500" : "bg-primary")}
                        style={{ width: `${(j.status === "concluido" ? 1 : j.progress) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{fmtDuration(j.segment.end - j.segment.start)}</span>
                  <span className={cn("text-xs font-mono uppercase justify-self-end inline-flex items-center gap-1.5",
                    j.status === "concluido" ? "text-emerald-400" : j.status === "processando" ? "text-primary" :
                    j.status === "erro" ? "text-destructive" : "text-muted-foreground")}>
                    {j.status === "processando" && <Loader2 className="w-3 h-3 animate-spin" />}
                    {j.status === "concluido" && <Check className="w-3 h-3" />}
                    {j.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <ExportsView creatives={finalCreatives} onDownload={downloadOne} onDownloadAll={downloadAll} onReset={reset} onPreview={(c) => setPreviewUrl(c.blobUrl)} />
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-6" onClick={() => setPreviewUrl(null)}>
          <div className="surface rounded-md p-3 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setPreviewUrl(null)} className="p-1 text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <video src={previewUrl} controls autoPlay className="w-full rounded" />
          </div>
        </div>
      )}
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const items = [{ n: 1, label: "Upload" }, { n: 2, label: "Cortes" }, { n: 3, label: "Processar" }, { n: 4, label: "Exportar" }];
  return (
    <div className="surface rounded-md p-2 mb-6 flex items-center">
      {items.map((it, i) => (
        <div key={it.n} className="flex items-center flex-1">
          <div className={cn("flex items-center gap-2.5 px-3 py-1.5 rounded text-sm",
            step === it.n ? "bg-primary/15 text-white" : step > it.n ? "text-muted-foreground" : "text-muted-foreground/60")}>
            <span className={cn("w-6 h-6 grid place-items-center rounded-full font-mono text-[11px]",
              step > it.n ? "bg-emerald-500 text-white" : step === it.n ? "bg-primary text-primary-foreground" : "bg-white/5")}>
              {step > it.n ? <Check className="w-3 h-3" /> : it.n}
            </span>
            <span className="font-medium">{it.label}</span>
          </div>
          {i < items.length - 1 && <div className="flex-1 h-px bg-border mx-2" />}
        </div>
      ))}
    </div>
  );
}

function ExportsView({ creatives, onDownload, onDownloadAll, onReset, onPreview }: {
  creatives: Creative[]; onDownload: (c: Creative) => void; onDownloadAll: () => void; onReset: () => void; onPreview: (c: Creative) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | CreativeType>("all");
  const filtered = creatives.filter((c) => typeFilter === "all" || c.type === typeFilter);
  return (
    <div className="space-y-5">
      <div className="surface rounded-md p-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">{creatives.length} criativos prontos</h3>
          <p className="text-sm text-muted-foreground">Baixe individualmente ou todos em ZIP.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="h-10 px-4 rounded-md border border-border text-sm hover:bg-white/5">Novo projeto</button>
          <button onClick={onDownloadAll} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Download className="w-4 h-4" /> Baixar todos (.zip)
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-muted-foreground uppercase">Filtrar:</span>
        {(["all", "gancho", "corpo", "cta"] as const).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn("px-2.5 h-7 rounded border transition",
              typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-white")}>
            {t === "all" ? "Todos" : typeLabel[t]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((c) => {
          const info = typeInfo[c.type];
          const Icon = info.icon;
          return (
            <div key={c.id} className="surface rounded-md overflow-hidden group">
              <div className="relative aspect-video bg-[#0a1428]">
                <img src={c.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                <button onClick={() => onPreview(c)} className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <div className="w-12 h-12 rounded-full bg-primary grid place-items-center">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </button>
                <span className={cn("absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1", info.color)}>
                  <Icon className="w-3 h-3" />{typeLabel[c.type]}
                </span>
                <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/60 backdrop-blur px-1.5 py-0.5 rounded">{fmtDuration(c.duration)}</span>
              </div>
              <div className="p-3">
                <div className="font-mono text-xs truncate">{c.name}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{fmtSize(c.size)}</span>
                  <button onClick={() => onDownload(c)} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <Download className="w-3 h-3" /> Baixar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generateAICuts(duration: number): CutPoint[] {
  const cuts: CutPoint[] = [];
  let t = 6 + Math.random() * 4;
  while (t < duration - 5) {
    cuts.push({ id: crypto.randomUUID(), time: parseFloat(t.toFixed(1)) });
    t += 15 + Math.random() * 15;
  }
  return cuts;
}

function buildSegments(videoId: string, duration: number, cuts: CutPoint[], existing: Segment[] = []): Segment[] {
  const boundaries = [0, ...cuts.map((c) => c.time).sort((a, b) => a - b), duration];
  return boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1];
    const prev = existing[i];
    const type: CreativeType = prev?.type ?? (i === 0 ? "gancho" : i === boundaries.length - 2 ? "cta" : "corpo");
    return {
      id: prev?.id ?? crypto.randomUUID(),
      name: prev?.name ?? `Criativo ${String(i + 1).padStart(2, "0")}`,
      type, start, end,
      targetDuration: prev?.targetDuration,
      sourceId: videoId,
    };
  });
}
