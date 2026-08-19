import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// 读取请求体
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// 返回 JSON
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// 安全路径检查：确保文件路径在指定目录内
function safePath(base, filename) {
  const resolved = path.resolve(base, filename);
  if (!resolved.startsWith(path.resolve(base))) return null;
  return resolved;
}

// 读取数据
async function loadEntries() {
  try {
    const raw = await fs.readFile(path.join(ROOT, 'data', 'entries.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// 写入数据
async function saveEntries(entries) {
  await fs.writeFile(
    path.join(ROOT, 'data', 'entries.json'),
    JSON.stringify(entries, null, 2),
    'utf8'
  );
}

// 生成唯一 ID
function genId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

// 处理 API 请求
async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;

  // GET /api/entries —— 获取所有记录
  if (req.method === 'GET' && pathname === '/api/entries') {
    const entries = await loadEntries();
    return sendJson(res, 200, entries);
  }

  // POST /api/entries —— 新建记录
  if (req.method === 'POST' && pathname === '/api/entries') {
    const body = JSON.parse(await readBody(req));
    const entries = await loadEntries();
    const entry = {
      id: genId(),
      createdAt: new Date().toISOString(),
      ...body,
    };
    entries.unshift(entry);
    await saveEntries(entries);
    return sendJson(res, 201, entry);
  }

  // PUT /api/entries/:id —— 更新记录
  const putMatch = pathname.match(/^\/api\/entries\/([^/]+)$/);
  if (req.method === 'PUT' && putMatch) {
    const id = decodeURIComponent(putMatch[1]);
    const body = JSON.parse(await readBody(req));
    const entries = await loadEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return sendJson(res, 404, { error: 'not found' });
    entries[idx] = { ...entries[idx], ...body, id, updatedAt: new Date().toISOString() };
    await saveEntries(entries);
    return sendJson(res, 200, entries[idx]);
  }

  // DELETE /api/entries/:id —— 删除记录
  if (req.method === 'DELETE' && putMatch) {
    const id = decodeURIComponent(putMatch[1]);
    const entries = await loadEntries();
    const target = entries.find(e => e.id === id);
    if (!target) return sendJson(res, 404, { error: 'not found' });
    // 删除关联的图片和刀模文件
    if (target.photos) {
      for (const p of target.photos) {
        if (p.file) {
          const fp = safePath(path.join(ROOT, 'images'), p.file);
          if (fp) await fs.unlink(fp).catch(() => {});
        }
      }
    }
    if (target.dieline && target.dieline.file) {
      const fp = safePath(path.join(ROOT, 'dielines'), target.dieline.file);
      if (fp) await fs.unlink(fp).catch(() => {});
    }
    const filtered = entries.filter(e => e.id !== id);
    await saveEntries(filtered);
    return sendJson(res, 200, { ok: true });
  }

  // POST /api/upload —— 上传文件（base64），返回文件名
  if (req.method === 'POST' && pathname === '/api/upload') {
    const body = JSON.parse(await readBody(req));
    const { folder, data, filename } = body;
    const dir = folder === 'dielines' ? 'dielines' : 'images';
    const base = path.join(ROOT, dir);
    // 解析 base64 data URL
    const match = /^data:([\w/.+-]+);base64,(.+)$/.exec(data);
    if (!match) return sendJson(res, 400, { error: 'invalid data url' });
    const buf = Buffer.from(match[2], 'base64');
    const ext = path.extname(filename) || guessExt(match[1]);
    const safeName = genId() + ext;
    const fp = path.join(base, safeName);
    await fs.writeFile(fp, buf);
    return sendJson(res, 200, { file: safeName, url: `/${dir}/${safeName}` });
  }

  return sendJson(res, 404, { error: 'unknown api' });
}

function guessExt(mime) {
  const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
  return map[mime] || '.bin';
}

// 静态文件服务
async function serveStatic(req, res, pathname) {
  const clean = pathname.replace(/^\/+/, '');
  let fp = safePath(ROOT, decodeURIComponent(clean));
  if (!fp) return sendJson(res, 403, { error: 'forbidden' });
  if (!clean || clean === 'index.html') fp = path.join(ROOT, 'index.html');
  try {
    const stat = await fs.stat(fp);
    if (stat.isDirectory()) {
      fp = path.join(fp, 'index.html');
    }
    const buf = await fs.readFile(fp);
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    // SPA fallback：找不到文件时返回 index.html
    try {
      const index = await fs.readFile(path.join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(index);
    } catch {
      sendJson(res, 404, { error: 'not found' });
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // 简单 CORS（局域网内手机访问）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: String(err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = server.address();
  console.log(`\n  包装灵感记录工具已启动`);
  console.log(`  本机访问:  http://localhost:${PORT}`);
  console.log(`  局域网访问: http://<本机IP>:${PORT}  （手机连同一WiFi打开）\n`);
});
