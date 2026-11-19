import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const LOCAL_UPLOAD_PREFIX = "/uploads/";

export function getUploadDirectory() {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.UPLOAD_DIR ?? "public/uploads",
  );
}

/** Identifica a imagem pelos magic bytes reais, sem confiar no Content-Type enviado. */
function detectImageExtension(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function saveProfileImage(file: File) {
  if (!allowedTypes.has(file.type))
    throw new Error("Formato inválido. Envie uma imagem JPG, PNG ou WebP.");
  if (file.size > MAX_IMAGE_SIZE)
    throw new Error("A imagem deve ter no máximo 5 MB.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedExt = detectImageExtension(buffer);
  if (!detectedExt)
    throw new Error("Arquivo inválido. Envie uma imagem JPG, PNG ou WebP.");

  const filename = `avatar-${randomUUID()}.${detectedExt}`;
  const uploadDirectory = getUploadDirectory();
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(
    path.join(/* turbopackIgnore: true */ uploadDirectory, filename),
    buffer,
  );
  return `${LOCAL_UPLOAD_PREFIX}${filename}`;
}

export async function deleteProfileImage(avatarUrl: string | null | undefined) {
  if (!avatarUrl || !avatarUrl.startsWith(LOCAL_UPLOAD_PREFIX)) return;
  const filename = path.basename(avatarUrl);
  if (!filename.startsWith("avatar-")) return;

  const uploadDirectory = getUploadDirectory();
  const resolved = path.resolve(uploadDirectory, filename);
  if (!resolved.startsWith(`${uploadDirectory}${path.sep}`)) return;

  try {
    await unlink(resolved);
  } catch {
    // arquivo já não existe ou não pôde ser removido; não bloqueia a atualização
  }
}
