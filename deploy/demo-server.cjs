const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const host = '127.0.0.1';
const port = Number(process.env.DEMO_PORT) || 3000;
const root = path.resolve(__dirname, '../crm-frontend/dist-demo');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.woff2':'font/woff2' };

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('فایل‌های دموی آماده پیدا نشدند. لطفاً بسته کامل را دوباره دریافت کنید.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
  let file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', path.basename(file) === 'index.html' ? 'no-cache' : 'public, max-age=3600');
  fs.createReadStream(file).on('error', () => { res.writeHead(500); res.end('Server error'); }).pipe(res);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error(`پورت ${port} در حال استفاده است. برنامه قبلی را ببندید و دوباره تلاش کنید.`);
  else console.error(error.message);
  process.exit(1);
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log('\n  باشگاه مشتریان پویا آماده است');
  console.log(`  آدرس: ${url}`);
  console.log('  برای توقف، این پنجره را ببندید یا Ctrl+C بزنید.\n');
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
});
