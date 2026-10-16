import { sqlite } from '@/db';
import { getCatalogRevision } from '@/lib/app-version';
export const dynamic='force-dynamic';
let cached:{revision:string;body:string}|undefined;
export function GET(request:Request){
  const revision=getCatalogRevision(),etag=JSON.stringify(`catalog-${revision}`);
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60',ETag:etag};
  if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
  if(cached?.revision!==revision){
    cached=sqlite.transaction(()=>({revision,body:JSON.stringify({version:revision,categories:sqlite.prepare('SELECT id,slug,title FROM categories ORDER BY sort_order,id').all(),materials:sqlite.prepare('SELECT slug,title,category_id AS categoryId,content,source_url AS sourceUrl,image_url AS imageUrl FROM materials ORDER BY sort_order,id').all()})}))();
  }
  return new Response(cached.body,{headers});
}
