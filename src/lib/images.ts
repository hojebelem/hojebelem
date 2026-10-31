// Mesma lista de `images.remotePatterns` no next.config.ts: mudou lá, mude aqui.
const OPTIMIZED_HOSTS = ["images.unsplash.com", "images.sympla.com.br"];

// Imagem que o next/image consegue otimizar. As outras são exibidas sem
// otimizar (unoptimized), em vez de derrubar a página com erro de domínio.
export function isOptimizableImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMIZED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
