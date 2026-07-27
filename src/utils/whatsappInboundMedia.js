const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('./AppError');
const { log } = require('./logger');
const fetchWithTimeout = require('./fetchWithTimeout');

const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
};

const graphApiVersion = () => process.env.WHATSAPP_API_VERSION || 'v25.0';

const accessToken = () => {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new AppError('WhatsApp access token is not configured', 503);
  }
  return token;
};

const extFromMime = (mimeType, fallbackExt = '') => {
  const mime = String(mimeType || '')
    .toLowerCase()
    .split(';')[0]
    .trim();
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  if (fallbackExt && fallbackExt.startsWith('.')) return fallbackExt.toLowerCase();
  return '.bin';
};

const safeBaseName = (name, ext) => {
  const raw = String(name || 'file')
    .replace(/[/\\]/g, '_')
    .replace(/[^\w.\- ()]/g, '_')
    .slice(0, 120);
  const base = raw || 'file';
  if (ext && base.toLowerCase().endsWith(ext.toLowerCase())) return base;
  return `${base}${ext}`;
};

/**
 * @param {string} mediaId Meta media object id from webhook
 * @returns {Promise<{ url: string, mime_type?: string }>}
 */
const fetchMediaMetadata = async (mediaId) => {
  const url = `https://graph.facebook.com/${graphApiVersion()}/${encodeURIComponent(mediaId)}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { Authorization: `Bearer ${accessToken()}` } },
    { label: 'WhatsApp media metadata' }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) {
    const detail = data?.error?.message || res.statusText || 'Media metadata fetch failed';
    throw new AppError(`WhatsApp media metadata failed: ${detail}`, 502);
  }
  return data;
};

/**
 * @param {string} downloadUrl Temporary URL from media metadata
 * @returns {Promise<Buffer>}
 */
const downloadMediaBuffer = async (downloadUrl) => {
  const res = await fetchWithTimeout(
    downloadUrl,
    { headers: { Authorization: `Bearer ${accessToken()}` } },
    { label: 'WhatsApp media download' }
  );
  if (!res.ok) {
    throw new AppError(`WhatsApp media download failed: ${res.statusText}`, 502);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

/**
 * Download inbound WhatsApp media and store under /uploads.
 * @param {{ mediaId: string, mimeType?: string, fileName?: string, peerPhone: string, inquiryId?: string, sessionId?: string }} params
 * @returns {Promise<{ mediaUrl: string, fileName: string, mimeType: string }>}
 */
const storeInboundMedia = async ({
  mediaId,
  mimeType,
  fileName,
  peerPhone,
  inquiryId,
  sessionId,
}) => {
  const meta = await fetchMediaMetadata(mediaId);
  const resolvedMime = mimeType || meta.mime_type || 'application/octet-stream';
  const ext = extFromMime(resolvedMime, path.extname(fileName || ''));
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const displayName = fileName ? safeBaseName(fileName, ext) : uniqueName;

  const relativeDir =
    sessionId && inquiryId
      ? path.join('amendments', 'inbound', String(inquiryId), String(sessionId))
      : path.join('whatsapp', 'inbound', String(peerPhone));

  const absoluteDir = path.join(process.cwd(), 'uploads', relativeDir);
  fs.mkdirSync(absoluteDir, { recursive: true });

  const buffer = await downloadMediaBuffer(meta.url);
  const absolutePath = path.join(absoluteDir, uniqueName);
  fs.writeFileSync(absolutePath, buffer);

  const mediaUrl = `/${path.posix.join('uploads', relativeDir, uniqueName)}`;

  log.info('[WhatsApp media] stored inbound file', {
    mediaId,
    peerPhone,
    mediaUrl,
    bytes: buffer.length,
  });

  return {
    mediaUrl,
    fileName: displayName,
    mimeType: resolvedMime,
  };
};

module.exports = {
  fetchMediaMetadata,
  downloadMediaBuffer,
  storeInboundMedia,
  extFromMime,
  safeBaseName,
};
