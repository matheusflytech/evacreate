import { Shield, X } from "lucide-react";
import { useStore } from "@/lib/store";

export function PrivacyBanner() {
  const seen = useStore((s) => s.privacySeen);
  const set = useStore((s) => s.setPrivacySeen);
  if (seen) return null;
  return (
    <div className="surface flex items-center gap-3 px-4 py-3 mb-6 rounded-md">
      <div className="w-9 h-9 rounded grid place-items-center bg-primary/15 text-primary shrink-0">
        <Shield className="w-4 h-4" />
      </div>
      <div className="flex-1 text-sm">
        <span className="font-medium text-white">Processamento 100% local.</span>{" "}
        <span className="text-muted-foreground">Seus vídeos nunca saem do seu dispositivo — toda a edição roda no seu navegador.</span>
      </div>
      <button onClick={set} className="text-muted-foreground hover:text-white p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
