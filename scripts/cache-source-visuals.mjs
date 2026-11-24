// Copy original image bytes, or rasterize an unchanged official PDF page. Never redraw a chart.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Media from '../app/source-media.js';
import Data from '../app/source-media-data.js';

const maxBytes=12*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function dimensions(width,height,size){
 if(size>maxBytes||width<280||height<100||width*height>60000000)throw Error('Source image dimensions or size are invalid');
 return {width,height};
}
export function inspectPNG(bytes){
 if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Source is not a PNG image');
 return dimensions(bytes.readUInt32BE(16),bytes.readUInt32BE(20),bytes.length);
}
export function inspectJPEG(bytes){
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('Source is not a JPEG image');
 let offset=2;
 while(offset+4<=bytes.length){
  if(bytes[offset++]!==255)throw Error('Malformed JPEG image');
  while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];if(marker===217||marker===218)break;
  const length=bytes.readUInt16BE(offset);
  if(length<2||offset+length>bytes.length)throw Error('Malformed JPEG segment');
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
   if(length<8)throw Error('Malformed JPEG dimensions');
   return dimensions(bytes.readUInt16BE(offset+5),bytes.readUInt16BE(offset+3),bytes.length);
  }
  offset+=length;
 }
 throw Error('JPEG image dimensions are unavailable');
}
export async function renderSourcePage(bytes,page){
 const directory=await mkdtemp(path.join(tmpdir(),'official-report-page-'));
 try{
  const input=path.join(directory,'source.pdf'),output=path.join(directory,'page.png');
  await writeFile(input,bytes);
  await promisify(execFile)('python3',[fileURLToPath(new URL('./render-source-page.py',import.meta.url)),input,String(page),output],{timeout:30000,maxBuffer:1024*1024});
  return await readFile(output);
 }finally{await rm(directory,{recursive:true,force:true});}
}
export async function cacheSourceVisuals({fetcher=fetch,renderer=renderSourcePage,entries=Data.entries,appRoot=fileURLToPath(new URL('../app/',import.meta.url)),now=new Date().toISOString()}={}){
 const records=[],downloads=new Map();
 async function download(url,type,id){
  if(downloads.has(url))return downloads.get(url);
  const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:type}});
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!==type)throw Error('Original source could not be verified: '+id+' (HTTP '+response.status+')');
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Error('Source is too large: '+id);chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);downloads.set(url,bytes);return bytes;
 }
 for(const raw of entries.filter(x=>x.cachedURL)){
  const item=Media.normalize(raw),source=item?.sourceURL,url=item?.url,pdf=item?.kind==='document_image';
  if(!source||!url||!['image','document_image'].includes(item.kind)||!/^assets\/source-visuals\/[a-z0-9-]+\.(?:png|jpg)$/.test(item.cachedURL)||pdf&&!item.cachedURL.endsWith('.png'))throw Error('Unapproved source image: '+raw.id);
  const type=pdf?'application/pdf':item.cachedURL.endsWith('.jpg')?'image/jpeg':'image/png';
  const original=await download(url,type,item.id);
  if(pdf&&(!original.subarray(0,5).equals(Buffer.from('%PDF-'))||!Number.isSafeInteger(item.documentPage)||item.documentPage<1))throw Error('Invalid official PDF or page: '+item.id);
  const bytes=pdf?await renderer(original,item.documentPage):original;
  const size=type==='image/jpeg'?inspectJPEG(bytes):inspectPNG(bytes),destination=path.join(appRoot,item.cachedURL);
  await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,bytes);
  records.push({id:item.id,sourceURL:source,originalURL:url,path:item.cachedURL,sha256:hash(bytes),sourceSha256:hash(original),bytes:bytes.length,...size,fetchedAt:now,...(pdf?{documentPage:item.documentPage,rendering:'Unchanged full PDF page at 144 dpi',renderer:'PyMuPDF 1.26.6'}:{rendering:'Original publisher image bytes'})});
 }
 await mkdir(path.join(appRoot,'assets/source-visuals'),{recursive:true});
 await writeFile(path.join(appRoot,'assets/source-visuals/manifest.json'),JSON.stringify({schemaVersion:2,records},null,2)+'\n');
 return records;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const records=await cacheSourceVisuals();
 console.log(JSON.stringify({originalImages:records.length,records}));
}
