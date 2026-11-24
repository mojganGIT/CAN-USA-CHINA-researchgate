// Preserve the publisher's original PNG bytes; never redraw the source graphic.
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Media from '../app/source-media.js';
import Data from '../app/source-media-data.js';

const maxBytes=12*1024*1024;
export function inspectPNG(bytes){
 if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Source is not a PNG image');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(bytes.length>maxBytes||width<280||height<100||width*height>60000000)throw Error('Source image dimensions or size are invalid');
 return {width,height};
}
export async function cacheSourceVisuals({fetcher=fetch,appRoot=fileURLToPath(new URL('../app/',import.meta.url)),now=new Date().toISOString()}={}){
 const records=[];
 for(const item of Data.entries.filter(x=>x.cachedURL)){
  const source=Media.sourceURL(item.sourceURL),url=Media.assetURL(item.url,source,'image');
  if(!source||!url||!/^assets\/source-visuals\/[a-z0-9-]+\.png$/.test(item.cachedURL))throw Error('Unapproved source image: '+item.id);
  const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'image/png'}});
  if(!response.ok||!/^image\/png(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('Original image could not be verified: '+item.id+' (HTTP '+response.status+')');
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Error('Source image is too large: '+item.id);chunks.push(chunk);}
  const bytes=Buffer.concat(chunks),dimensions=inspectPNG(bytes),destination=path.join(appRoot,item.cachedURL);
  await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,bytes);
  records.push({id:item.id,sourceURL:source,originalURL:url,path:item.cachedURL,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,...dimensions,fetchedAt:now});
 }
 await writeFile(path.join(appRoot,'assets/source-visuals/manifest.json'),JSON.stringify({schemaVersion:1,records},null,2)+'\n');
 return records;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const records=await cacheSourceVisuals();
 console.log(JSON.stringify({originalImages:records.length,records}));
}
