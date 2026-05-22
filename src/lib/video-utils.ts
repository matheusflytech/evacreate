export async function extractVideoMeta(file: File): Promise<{ duration: number; thumbnail: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration / 4); };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 180;
      canvas.width = 320;
      canvas.height = Math.round(h * (320 / w));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ duration: video.duration, thumbnail: canvas.toDataURL("image/jpeg", 0.7), width: w, height: h });
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao ler o vídeo")); };
  });
}

// Corte via MediaRecorder — sem FFmpeg, sem WASM, sem dependências externas
export async function trimVideo(
  file: File,
  start: number,
  end: number,
  onProgress?: (p: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = false;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      const duration = end - start;
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const stream = (video as any).captureStream();
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        resolve(new Blob(chunks, { type: mimeType }));
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Erro ao gravar segmento"));
      };

      video.currentTime = start;

      video.onseeked = () => {
        recorder.start(100);
        video.play();

        const interval = setInterval(() => {
          const elapsed = video.currentTime - start;
          onProgress?.(Math.min(0.99, elapsed / duration));

          if (video.currentTime >= end - 0.05) {
            clearInterval(interval);
            video.pause();
            recorder.stop();
            onProgress?.(1);
          }
        }, 100);
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar vídeo para corte"));
    };
  });
}

// Mantém compatibilidade com código existente
export async function getFFmpeg() { return null; }
