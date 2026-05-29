import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { env } from "@space-scavenger-hunt/env/server";

let cachedClient: BlobServiceClient | undefined;
let cachedSharedKey: StorageSharedKeyCredential | undefined;

function parseConnectionString(connectionString: string) {
  const parts = connectionString.split(";").filter(Boolean);
  const map = new Map<string, string>();
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    map.set(key, value);
  }
  return {
    accountName: map.get("AccountName"),
    accountKey: map.get("AccountKey"),
  };
}

function getBlobServiceClient() {
  if (cachedClient) return cachedClient;
  cachedClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  return cachedClient;
}

function getSharedKeyCredential() {
  if (cachedSharedKey) return cachedSharedKey;
  const { accountName, accountKey } = parseConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  if (!accountName || !accountKey) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING must contain AccountName and AccountKey.");
  }
  cachedSharedKey = new StorageSharedKeyCredential(accountName, accountKey);
  return cachedSharedKey;
}

function getContainerClient() {
  return getBlobServiceClient().getContainerClient(env.AZURE_STORAGE_CONTAINER_NAME);
}

export async function ensureContainer() {
  const containerClient = getContainerClient();
  await containerClient.createIfNotExists();
}

export type UploadImageInput = {
  blobName: string;
  buffer: Buffer;
  contentType: string;
};

export async function uploadImage(input: UploadImageInput): Promise<{ url: string }> {
  await ensureContainer();
  const blobClient = getContainerClient().getBlockBlobClient(input.blobName);
  await blobClient.uploadData(input.buffer, {
    blobHTTPHeaders: { blobContentType: input.contentType },
  });
  return { url: blobClient.url };
}

const sasUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function getReadSasUrl(blobName: string, ttlMinutes = 15): string {
  const now = Date.now();
  const cached = sasUrlCache.get(blobName);
  // Reuse cached URLs so polling endpoints don't invalidate browser/image caches.
  if (cached && cached.expiresAt > now + 2 * 60 * 1000) {
    return cached.url;
  }

  const credential = getSharedKeyCredential();
  const containerClient = getContainerClient();
  const blobClient = containerClient.getBlobClient(blobName);
  const startsOn = new Date(now - 5 * 60 * 1000);
  const expiresOn = new Date(now + ttlMinutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: env.AZURE_STORAGE_CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
      protocol: undefined,
    },
    credential,
  ).toString();
  const url = `${blobClient.url}?${sas}`;
  sasUrlCache.set(blobName, { url, expiresAt: expiresOn.getTime() });
  return url;
}

export function buildBlobName({
  teamId,
  attemptId,
  extension,
}: {
  teamId: string;
  attemptId: string;
  extension: string;
}) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `claims/${teamId}/${attemptId}/${ts}.${safeExt}`;
}

export function buildHintBlobName({
  hintId,
  extension,
}: {
  hintId: string;
  extension: string;
}) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `hints/${hintId}/${ts}.${safeExt}`;
}

export function buildAstronautBlobName({
  astronautId,
  extension,
}: {
  astronautId: string;
  extension: string;
}) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `astronauts/${astronautId}/${ts}.${safeExt}`;
}

export async function deleteBlob(blobName: string): Promise<void> {
  const blobClient = getContainerClient().getBlobClient(blobName);
  await blobClient.deleteIfExists();
  sasUrlCache.delete(blobName);
}

export async function openBlobReadStream(blobName: string) {
  const blobClient = getContainerClient().getBlobClient(blobName);
  const download = await blobClient.download(0);
  if (!download.readableStreamBody) {
    throw new Error(`Blob stream unavailable for ${blobName}`);
  }
  return {
    stream: download.readableStreamBody,
    contentType: download.contentType,
  };
}
