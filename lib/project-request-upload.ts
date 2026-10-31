import { ensureEnquirySession, resetEnquirySession } from "./request-client";

/** Upload through our server; ImageKit credentials and private URLs stay server-side. */
export async function uploadProjectReference(
  item: { id: string; file: File },
  onProgress: (progress: number) => void,
  signal: AbortSignal,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await ensureEnquirySession(signal);
    const result = await new Promise<{ status: number; uploadId?: string; error?: string }>((resolve, reject) => {
      signal.throwIfAborted();
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();
      const clean = () => signal.removeEventListener("abort", abort);
      xhr.open("POST", "/api/project-request/upload");
      xhr.timeout = 55000;
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) onProgress(Math.min(95, Math.round(event.loaded / event.total * 95)));
      };
      xhr.onerror = xhr.ontimeout = () => { clean(); reject(new Error("uploadFailed")); };
      xhr.onabort = () => { clean(); reject(new DOMException("Upload cancelled", "AbortError")); };
      xhr.onload = () => {
        clean();
        try { resolve({ ...JSON.parse(xhr.responseText), status: xhr.status }); }
        catch { reject(new Error("uploadFailed")); }
      };
      signal.addEventListener("abort", abort, { once: true });
      const data = new FormData(); data.set("file", item.file); data.set("uploadId", item.id);
      xhr.send(data);
    });
    if (result.status >= 200 && result.status < 300 && result.uploadId === item.id) return item.id;
    if (result.status === 401 && attempt === 0) { resetEnquirySession(); continue; }
    throw new Error(result.error || "uploadFailed");
  }
  throw new Error("uploadFailed");
}
