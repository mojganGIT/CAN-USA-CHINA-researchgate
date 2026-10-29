import {cp,rm,mkdir} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const f of ['index.html','app.js','style.css','data.json','staticwebapp.config.json']) await cp(`src/${f}`,`dist/${f}`);
console.log('Built dist successfully');
