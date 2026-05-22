export async function extractVideoMeta(file: File): Promise<{ duration: number; thumbnail: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = () => {
      // seek to ~1s for a meaningful thumbnail
      const seekTo = Math.min(1, video.duration / 4);
      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 180;
      const scale = 320 / w;
      canvas.width = 320;
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      resolve({ duration: video.duration, thumbnail, width: w, height: h });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao ler o vídeo"));
    };
  });
}

let ffmpegInstance: any = null;
export async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ff = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
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
  const input = "in.mp4";
  const output = "out.mp4";
  await ff.writeFile(input, await fetchFile(file));

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ff.on("progress", progressHandler);

  await ff.exec([
    "-ss", String(start),
    "-i", input,
    "-t", String(Math.max(0.1, end - start)),
    "-c", "copy",
    "-avoid_negative_ts", "1",
    output,
  ]);

  ff.off("progress", progressHandler);
  const data = await ff.readFile(output);
  await ff.deleteFile(input);
  await ff.deleteFile(output);
  const bytes = new Uint8Array(data as Uint8Array);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
}
