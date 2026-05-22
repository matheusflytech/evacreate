export async function extractVideoMeta(file: File): Promise<{ duration: number; thumbnail: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.crossOrigin = "anonymous";
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

let ffmpegInstance: any = null;

export async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const ff = new FFmpeg();

  // ffmpeg-core.js hospedado no próprio domínio (evita import() bloqueado)
  // ffmpeg-core.wasm vem da CDN como binário puro (fetch simples, sem import())
  const coreURL = "/ffmpeg/ffmpeg-core.js";
  const wasmResp = await fetch("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm");
  const wasmBlob = await wasmResp.blob();
  const wasmURL = URL.createObjectURL(wasmBlob);

  await ff.load({ coreURL, wasmURL });

  ffmpegInstance = ff;
  return ff;
}

export async function trimVideo(
  file: File,
  start: number,
  end: number,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  await ff.writeFile("in.mp4", await fetchFile(file));

  ff.on("progress", ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  });

  await ff.exec([
    "-ss", String(start),
    "-i", "in.mp4",
    "-t", String(Math.max(0.1, end - start)),
    "-c", "copy",
    "-avoid_negative_ts", "1",
    "out.mp4",
  ]);

  const data = await ff.readFile("out.mp4");
  await ff.deleteFile("in.mp4");
  await ff.deleteFile("out.mp4");
  return new Blob([new Uint8Array(data as Uint8Array).buffer], { type: "video/mp4" });
}
