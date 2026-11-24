import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {cacheSourceVisuals,inspectPNG,inspectJPEG,inspectSVG} from '../scripts/cache-source-visuals.mjs';
import Data from '../app/source-media-data.js';

// A valid, synthetic PNG tests byte preservation; it is never published as source media.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAIAAADrOSKFAAABvUlEQVR4nO3TQQEAEADAQERQQxL9C4mxh7sE+2zucwfQWXUA/M6EEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNCzIQQMyHETAgxE0LMhBAzIcRMCDETQsyEEDMhxEwIMRNC7AHdGAGya+9GNQAAAABJRU5ErkJggg==','base64');

test('deployment copies original image bytes and records their publisher, checksum, dimensions and fetch time',async()=>{
 const appRoot=await mkdtemp(path.join(tmpdir(),'source-visual-cache-')),requests=[],now='2026-11-24T18:00:00Z';
 try{
  const entries=Data.entries.filter(x=>['statcan-fdi-2025','stronger-canada-plan-diagram'].includes(x.id));
  const records=await cacheSourceVisuals({appRoot,entries,now,fetcher:async(url,options)=>{requests.push({url,options});return new Response(png,{headers:{'Content-Type':'image/png'}});}});
  assert.equal(records.length,2);assert.equal(requests.length,2);
  for(const record of records){
   const item=Data.entries.find(x=>x.id===record.id);assert.equal(record.originalURL,item.url);assert.equal(record.sourceURL,item.sourceURL);assert.equal(record.path,item.cachedURL);assert.equal(record.fetchedAt,now);assert.equal(record.width,300);assert.equal(record.height,150);assert.equal(record.sha256,createHash('sha256').update(png).digest('hex'));assert.deepEqual(await readFile(path.join(appRoot,record.path)),png);
  }
  const manifest=JSON.parse(await readFile(path.join(appRoot,'assets/source-visuals/manifest.json'),'utf8'));assert.deepEqual(manifest.records,records);assert(requests.every(r=>r.options.redirect==='error'));
 }finally{await rm(appRoot,{recursive:true,force:true});}
});

test('report pages share one verified PDF download while retaining distinct page numbers and source and rendering checksums',async()=>{
 const appRoot=await mkdtemp(path.join(tmpdir(),'source-report-cache-')),entries=Data.entries.filter(x=>x.kind==='document_image');
 const pdf=Buffer.from('%PDF-1.7\nverified report fixture\n%%EOF'),requests=[],pages=[];
 try{
  const records=await cacheSourceVisuals({appRoot,entries,fetcher:async(url)=>{requests.push(url);return new Response(pdf,{headers:{'Content-Type':'application/pdf'}});},renderer:async(bytes,page)=>{assert.deepEqual(bytes,pdf);pages.push(page);return png;}});
  assert.equal(requests.length,1);assert.equal(records.length,4);assert.deepEqual(pages,[15,11,12,10]);
  for(const record of records){assert.equal(record.sourceSha256,createHash('sha256').update(pdf).digest('hex'));assert.equal(record.sha256,createHash('sha256').update(png).digest('hex'));assert(record.rendering.includes('Unchanged full PDF page'));assert(record.path.endsWith('.png'));assert.deepEqual(await readFile(path.join(appRoot,record.path)),png);}
  await assert.rejects(cacheSourceVisuals({appRoot,entries,fetcher:async()=>new Response('HTML error',{headers:{'Content-Type':'application/pdf'}})}),/Invalid official PDF/);
  await assert.rejects(cacheSourceVisuals({appRoot,entries:[{...entries[0],documentPage:99}],fetcher:async()=>{throw Error('must not fetch');}}),/Unapproved source/);
 }finally{await rm(appRoot,{recursive:true,force:true});}
});

test('original JPEG photographs retain their bytes and dimensions rather than becoming fabricated outcome graphics',async()=>{
 const appRoot=await mkdtemp(path.join(tmpdir(),'source-jpeg-cache-')),entries=[{...Data.entries[0],id:'jpeg-test-only',url:'https://www150.statcan.gc.ca/test-only-source.jpg',cachedURL:'assets/source-visuals/jpeg-test-only.jpg'}];
 // Minimal JPEG marker fixture for dimension parsing; never published as a source photograph.
 const jpeg=Buffer.from([255,216,255,192,0,11,8,1,44,2,88,1,1,17,0,255,217]);
 try{
  assert.deepEqual(inspectJPEG(jpeg),{width:600,height:300});
  const [record]=await cacheSourceVisuals({appRoot,entries,fetcher:async()=>new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}})});
  assert.equal(record.width,600);assert.equal(record.height,300);assert.equal(record.sourceSha256,record.sha256);assert.deepEqual(await readFile(path.join(appRoot,record.path)),jpeg);
  assert.throws(()=>inspectJPEG(png),/not a JPEG/);assert.throws(()=>inspectJPEG(Buffer.from([255,216,255,192,255,255,255,217])),/Malformed JPEG/);
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

test('the EIA SVG is preserved byte for byte with verified dimensions and rejects HTML or active XML',async()=>{
 const appRoot=await mkdtemp(path.join(tmpdir(),'source-svg-cache-')),entry=Data.entries.find(x=>x.id==='eia-lng-destinations-2025');
 // Synthetic validation fixture only; no fabricated chart is published.
 const svg=Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="800px" height="400" viewBox="0 0 800 400"><rect width="800" height="400"/></svg>');
 try{
  const [record]=await cacheSourceVisuals({appRoot,entries:[entry],fetcher:async()=>new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8'}})});
  assert.equal(record.width,800);assert.equal(record.height,400);assert.equal(record.sourceSha256,record.sha256);assert.deepEqual(await readFile(path.join(appRoot,record.path)),svg);assert.equal(record.originalURL,entry.url);
  assert.deepEqual(inspectSVG(Buffer.from('<svg viewBox="0 0 900 500"></svg>')),{width:900,height:500});
  for(const bad of ['<html>error</html>','<!DOCTYPE svg><svg width="800" height="400"></svg>','<svg width="800" height="400"><script>alert(1)</script></svg>','<svg width="8" height="4"></svg>'])assert.throws(()=>inspectSVG(Buffer.from(bad)));
 }finally{await rm(appRoot,{recursive:true,force:true});}
});
