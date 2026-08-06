import { supabase } from './client';
import type { SiteContent, CmsProgram, CmsNews, CmsTeam, CmsGallery, CmsDownload, CmsContact } from '../types';

// ── Site Content ──────────────────────────────────────────────────────────────
export async function dbLoadSiteContent(): Promise<{ data: SiteContent | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .single();
  return { data: data as SiteContent | null, error };
}

// Single known ID for the site_content singleton row
const SITE_CONTENT_ID = '00000000-0000-0000-0000-000000000001';

export async function dbSaveSiteContent(content: Partial<SiteContent>): Promise<{ data: SiteContent | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('site_content')
    .upsert({ ...content, id: SITE_CONTENT_ID })
    .select()
    .single();
  return { data: data as SiteContent | null, error };
}

// ── Programs ──────────────────────────────────────────────────────────────────
export async function dbLoadPrograms(): Promise<{ data: CmsProgram[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cms_programs')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as CmsProgram[] | null, error };
}

export async function dbSaveProgram(program: Partial<CmsProgram>): Promise<{ data: CmsProgram | null; error: Error | null }> {
  if (program.id) {
    const { data, error } = await supabase
      .from('cms_programs')
      .update(program)
      .eq('id', program.id)
      .select()
      .single();
    return { data: data as CmsProgram | null, error };
  }
  const { data, error } = await supabase
    .from('cms_programs')
    .insert({ ...program, id: crypto.randomUUID() })
    .select()
    .single();
  return { data: data as CmsProgram | null, error };
}

export async function dbDeleteProgram(id: string): Promise<{ error: Error | null }> {
  return supabase.from('cms_programs').delete().eq('id', id);
}

// ── News ──────────────────────────────────────────────────────────────────────
export async function dbLoadNews(): Promise<{ data: CmsNews[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cms_news')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as CmsNews[] | null, error };
}

export async function dbSaveNewsArticle(article: Partial<CmsNews>): Promise<{ data: CmsNews | null; error: Error | null }> {
  if (article.id) {
    const { data, error } = await supabase
      .from('cms_news')
      .update(article)
      .eq('id', article.id)
      .select()
      .single();
    return { data: data as CmsNews | null, error };
  }
  const { data, error } = await supabase
    .from('cms_news')
    .insert({ ...article, id: crypto.randomUUID() })
    .select()
    .single();
  return { data: data as CmsNews | null, error };
}

export async function dbDeleteNews(id: string): Promise<{ error: Error | null }> {
  return supabase.from('cms_news').delete().eq('id', id);
}

// ── Team ──────────────────────────────────────────────────────────────────────
export async function dbLoadTeam(): Promise<{ data: CmsTeam[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cms_team')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as CmsTeam[] | null, error };
}

export async function dbSaveTeamMember(member: Partial<CmsTeam>): Promise<{ data: CmsTeam | null; error: Error | null }> {
  if (member.id) {
    const { data, error } = await supabase
      .from('cms_team')
      .update(member)
      .eq('id', member.id)
      .select()
      .single();
    return { data: data as CmsTeam | null, error };
  }
  const { data, error } = await supabase
    .from('cms_team')
    .insert({ ...member, id: crypto.randomUUID() })
    .select()
    .single();
  return { data: data as CmsTeam | null, error };
}

export async function dbDeleteTeamMember(id: string): Promise<{ error: Error | null }> {
  return supabase.from('cms_team').delete().eq('id', id);
}

// ── Gallery ───────────────────────────────────────────────────────────────────
export async function dbLoadGallery(): Promise<{ data: CmsGallery[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cms_gallery')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as CmsGallery[] | null, error };
}

// `image` may be explicitly null to clear a gallery photo on update
// (undefined would be dropped by the update payload spread).
export async function dbSaveGalleryImage(image: Omit<Partial<CmsGallery>, 'image'> & { image?: string | null }): Promise<{ data: CmsGallery | null; error: Error | null }> {
  if (image.id) {
    const { data, error } = await supabase
      .from('cms_gallery')
      .update(image)
      .eq('id', image.id)
      .select()
      .single();
    return { data: data as CmsGallery | null, error };
  }
  const { data, error } = await supabase
    .from('cms_gallery')
    .insert({ ...image, id: crypto.randomUUID() })
    .select()
    .single();
  return { data: data as CmsGallery | null, error };
}

export async function dbDeleteGalleryImage(id: string): Promise<{ error: Error | null }> {
  return supabase.from('cms_gallery').delete().eq('id', id);
}

// ── Downloads ─────────────────────────────────────────────────────────────────
export async function dbLoadDownloads(): Promise<{ data: CmsDownload[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cms_downloads')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as CmsDownload[] | null, error };
}

export async function dbSaveDownload(item: Partial<CmsDownload>): Promise<{ data: CmsDownload | null; error: Error | null }> {
  if (item.id) {
    const { data, error } = await supabase
      .from('cms_downloads')
      .update(item)
      .eq('id', item.id)
      .select()
      .single();
    return { data: data as CmsDownload | null, error };
  }
  const { data, error } = await supabase
    .from('cms_downloads')
    .insert({ ...item, id: crypto.randomUUID() })
    .select()
    .single();
  return { data: data as CmsDownload | null, error };
}

export async function dbDeleteDownload(id: string): Promise<{ error: Error | null }> {
  return supabase.from('cms_downloads').delete().eq('id', id);
}

// ── Contacts / Inbox ──────────────────────────────────────────────────────────
export async function dbLoadContacts(): Promise<{ data: CmsContact[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('cms_contacts')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as CmsContact[] | null, error };
}

export async function dbMarkContactRead(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('cms_contacts')
    .update({ read: true })
    .eq('id', id);
  return { error };
}

export async function dbDeleteContact(id: string): Promise<{ error: Error | null }> {
  return supabase.from('cms_contacts').delete().eq('id', id);
}
