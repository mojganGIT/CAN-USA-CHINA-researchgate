import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {cacheSourceVisuals,inspectPNG} from '../scripts/cache-source-visuals.mjs';
import Data from '../app/source-media-data.js';

// A valid, synthetic PNG tests byte preservation; it is never published as source media.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAIAAADrOSKFAAABvUlEQVR4nO3TQQEAEADAQERQQxL9C4mxh7sE+2zucwfQWXUA/M6EEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNC7AHdGAGya+9GNQAAAABJRU5ErkJggg==','base64');

test('deployment copies original image bytes and records their publisher, checksum, dimensions and fetch time',async()=>{
 const appRoot=await mkdtemp(path.join(tmpdir(),'source-visual-cache-')),requests=[],now='2026-11-24T18:00:00Z';
 try{
  const records=await cacheSourceVisuals({appRoot,now,fetcher:async(url,options)=>{requests.push({url,options});return new Response(png,{headers:{'Content-Type':'image/png'}});}});
  assert.equal(records.length,2);assert.equal(requests.length,2);
  for(const record of records){
   const item=Data.entries.find(x=>x.id===record.id);assert.equal(record.originalURL,item.url);assert.equal(record.sourceURL,item.sourceURL);assert.equal(record.path,item.cachedURL);assert.equal(record.fetchedAt,now);assert.equal(record.width,300);assert.equal(record.height,150);assert.equal(record.sha256,createHash('sha256').update(png).digest('hex'));assert.deepEqual(await readFile(path.join(appRoot,record.path)),png);
  }
  const manifest=JSON.parse(await readFile(path.join(appRoot,'assets/source-visuals/manifest.json'),'utf8'));assert.deepEqual(manifest.records,records);assert(requests.every(r=>r.options.redirect==='error'));
 }finally{await rm(appRoot,{recursive:true,force:true});}
});

test('HTML errors, rejected downloads and malformed images stop publication instead of masquerading as source graphics',async()=>{
 const appRoot=await mkdtemp(path.join(tmpdir(),'source-visual-errors-'));
 try{
  await assert.rejects(cacheSourceVisuals({appRoot,fetcher:async()=>new Response('<html>Unavailable</html>',{headers:{'Content-Type':'text/html'}})}),/could not be verified/);
  await assert.rejects(cacheSourceVisuals({appRoot,fetcher:async()=>new Response('Unavailable',{status:503})}),/could not be verified/);
  await assert.rejects(cacheSourceVisuals({appRoot,fetcher:async()=>new Response('not a PNG',{headers:{'Content-Type':'image/png'}})}),/not a PNG/);
  assert.throws(()=>inspectPNG(Buffer.alloc(20)),/not a PNG/);
 }finally{await rm(appRoot,{recursive:true,force:true});}
});
