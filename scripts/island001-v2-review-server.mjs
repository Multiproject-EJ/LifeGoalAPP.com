import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve('docs/gauntlets/island-001-v2/qa/raw');
const server = await createServer({ server: { host: '127.0.0.1', port: 53282, strictPort: true }, plugins: [{ name: 'island001-local-capture', configureServer(server) {
  server.middlewares.use('/__island001_capture', async (req, res) => {
    if (req.method !== 'POST' || !/^127\.0\.0\.1:53282$/.test(req.headers.host || '')) { res.statusCode = 405; res.end(); return; }
    try {
      const chunks=[]; let bytes=0;
      for await (const chunk of req) { bytes+=chunk.length; if(bytes>20000000) throw new Error('Capture too large'); chunks.push(chunk); }
      const { name, png, metadata } = JSON.parse(Buffer.concat(chunks).toString());
      if (!/^[a-z0-9-]+\.png$/.test(name) || !png.startsWith('data:image/png;base64,')) throw new Error('Invalid capture');
      await mkdir(output,{recursive:true});
      await writeFile(resolve(output,name),Buffer.from(png.split(',')[1],'base64'),{flag:'wx'});
      await writeFile(resolve(output,name.replace('.png','.json')),JSON.stringify(metadata,null,2),{flag:'wx'});
      res.end(JSON.stringify({saved:name}));
    } catch(error) {res.statusCode=400;res.end(String(error));}
  });
}}]});
await server.listen();server.printUrls();
