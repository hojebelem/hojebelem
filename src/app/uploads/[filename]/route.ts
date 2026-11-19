import { readFile } from "node:fs/promises";
import path from "node:path";
import { getUploadDirectory } from "@/lib/upload";

// ponytail: evita S3/R2 enquanto um volume persistente (UPLOAD_DIR) resolve o deploy único
const AVATAR_FILENAME = /^avatar-[0-9a-f-]+\.(jpg|png|webp)$/i;
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const match = AVATAR_FILENAME.exec(filename);
  if (!match) return new Response("Not found", { status: 404 });

  const dir = getUploadDirectory();
  const resolved = path.resolve(/* turbopackIgnore: true */ dir, path.basename(filename));
  if (!resolved.startsWith(`${dir}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(/* turbopackIgnore: true */ resolved);
    return new Response(data, {
      headers: {
        "Content-Type": MIME_TYPES[match[1].toLowerCase()],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
