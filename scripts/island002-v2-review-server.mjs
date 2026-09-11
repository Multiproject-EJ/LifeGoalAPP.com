import { createServer } from 'vite';
const server = await createServer({cacheDir: '.vite-island002-v2', server:{host:'127.0.0.1',port:53284,strictPort:true}});
await server.listen();server.printUrls();
