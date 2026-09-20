import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
export default defineConfig({plugins:[react(),{name:'local-arrival-capture',configureServer(server){
  server.middlewares.use('/__arrival-capture',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    const chunks:Buffer[]=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>100_000_000){res.statusCode=413;res.end();return;}chunks.push(chunk);}
    const out=path.resolve('../../outputs');await mkdir(out,{recursive:true});await writeFile(path.join(out,'habitgame-first-arrival.webm'),Buffer.concat(chunks));
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:true}));
  });
}}],cacheDir:'.vite-arrival-cache',server:{host:'127.0.0.1',port:5197,strictPort:true}});
