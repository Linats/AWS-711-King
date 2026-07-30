#!/usr/bin/env node
// 一次性拉起四个角色站点的开发服务器：主站的跨站超链需要目标端口有服务在监听。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const frontendDir = fileURLToPath(new URL('..', import.meta.url));

const viteBin = [
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
  new URL('../../../node_modules/vite/bin/vite.js', import.meta.url)
].map(fileURLToPath).find(existsSync);

if (!viteBin) {
  console.error('[dev-sites] 找不到 vite 可执行文件，请先在仓库根目录执行 npm install');
  process.exit(1);
}

const sites = [
  { id: 'customer', label: '优惠券中心（主站）', port: 5173 },
  { id: 'operator', label: '运营控制台', port: 5174 },
  { id: 'verifier', label: '核销终端', port: 5175 },
  { id: 'admin', label: '数据与审计中心', port: 5176 }
];

const only = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const selected = only.length ? sites.filter((site) => only.includes(site.id)) : sites;
if (!selected.length) {
  console.error(`[dev-sites] 未知站点：${only.join(', ')}；可选 ${sites.map((site) => site.id).join(' / ')}`);
  process.exit(1);
}

console.log('[dev-sites] 正在启动站点：');
for (const site of selected) console.log(`  ${site.label.padEnd(20, ' ')} http://localhost:${site.port}/`);
console.log('[dev-sites] 按 Ctrl+C 一起停止\n');

const children = new Map();
let shuttingDown = false;

const forward = (site, stream, isError) => {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const text = `[${site.id}] ${line}`;
      if (isError) console.error(text); else console.log(text);
    }
  });
};

for (const site of selected) {
  const child = spawn(process.execPath, [viteBin, '--config', `vite.${site.id}.config.ts`], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env
  });
  children.set(site.id, child);
  forward(site, child.stdout, false);
  forward(site, child.stderr, true);
  child.on('exit', (code, signal) => {
    children.delete(site.id);
    if (shuttingDown) return;
    if (code !== 0) console.error(`[${site.id}] 站点退出（code=${code} signal=${signal}）：端口 ${site.port} 可能已被占用`);
    if (children.size === 0) process.exit(code ?? 0);
  });
}

const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) child.kill();
  setTimeout(() => process.exit(0), 300);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
