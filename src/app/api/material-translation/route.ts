import { NextRequest, NextResponse } from "next/server";
import { getMaterialBySlugCached } from "@/lib/data";
import { cachedMaterialContent, localizedMaterialContent } from "@/lib/material-translation";
import { isLocale } from "@/lib/locale";
let active=0;
export async function GET(req:NextRequest) {
  const slug=req.nextUrl.searchParams.get("slug")||"",locale=req.nextUrl.searchParams.get("lang");
  if(!isLocale(locale)||slug.length>200)return NextResponse.json({error:"Invalid request"},{status:400});
  const material=await getMaterialBySlugCached(slug);
  if(!material)return NextResponse.json({error:"Not found"},{status:404});
  const cached=cachedMaterialContent(material,locale);
  if(cached)return NextResponse.json(cached,{headers:{"Cache-Control":"public, max-age=300"}});
  if(active>=8)return NextResponse.json({error:"Busy"},{status:429,headers:{"Retry-After":"5"}});
  active++;
  try {const result=await localizedMaterialContent(material,locale);return NextResponse.json(result,{status:result.translated?200:503,headers:{"Cache-Control":"no-store"}});}finally{active--;}
}
