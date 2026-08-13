import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/hooks/useToast';
import { clearCmsCache } from '@/hooks/useCmsData';
import { dbLoadSiteContent, dbSaveSiteContent } from '@/supabase/cms';
import type { SiteContent as SiteContentType } from '@/types';

interface SiteContentProps {
  onNavigate: (page: string) => void;
}

// Module-level so React never sees a "new" component type on every render —
// defining a component inside another component makes React unmount and remount
// the inputs on each keystroke, which steals focus after every character.
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea';
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {type === 'textarea' ? (
        <Textarea value={value} onChange={e => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function SiteContent({ onNavigate }: SiteContentProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<SiteContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await dbLoadSiteContent();
    if (data) setContent(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key: keyof SiteContentType, value: string) => {
    setContent(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    const { error } = await dbSaveSiteContent(content);
    if (error) {
      toast('Save failed: ' + error.message, true);
    } else {
      clearCmsCache();
      toast('✓ All content saved successfully.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-4" />
        Loading content…
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No site content found. Please set up the site_content table in Supabase.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-navy">⚙️ Site Content</h2>
          <p className="text-sm text-muted-foreground">Edit hero section, about text, mission, vision, and contact details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('cms-dashboard')}>← Back</Button>
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            {saving ? '💾 Saving…' : '💾 Save All Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Logo & Photos */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">🖼 Logo & Photos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUpload
                label="Board Logo"
                folder="logo"
                maxDim={512}
                value={content.logo_url}
                onChange={v => update('logo_url', v || '')}
                hint="PNG with transparent background preferred — replaces the 🏛 emblem"
              />
              <ImageUpload
                label="Hero Photo"
                folder="hero"
                maxDim={1920}
                value={content.hero_image}
                onChange={v => update('hero_image', v || '')}
                hint="Wide photo — appears behind the hero text (dark overlay keeps text readable)"
              />
              <div className="md:col-span-2">
                <ImageUpload
                  label="About Photo"
                  folder="about"
                  maxDim={1400}
                  value={content.about_image}
                  onChange={v => update('about_image', v || '')}
                  hint="Optional photo shown at the top of the About section"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hero Section */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">🏛 Hero Section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Badge Text" value={content.hero_badge} onChange={v => update('hero_badge', v)} />
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Title (Line 1)" value={content.hero_title_1} onChange={v => update('hero_title_1', v)} />
                <Field label="Title (Gold Highlight)" value={content.hero_title_2} onChange={v => update('hero_title_2', v)} />
              </div>
              <Field label="Subtitle" value={content.hero_title_sub} onChange={v => update('hero_title_sub', v)} />
              <Field label="Description" type="textarea" value={content.hero_desc} onChange={v => update('hero_desc', v)} />
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">📖 About Section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Section Tag" value={content.about_tag} onChange={v => update('about_tag', v)} />
              <Field label="Section Title" value={content.about_title} onChange={v => update('about_title', v)} />
              <Field label="Section Subtitle" value={content.about_sub} onChange={v => update('about_sub', v)} />
              <Field label="Vision Statement" type="textarea" value={content.vision_text} onChange={v => update('vision_text', v)} />
              <Field label="Mission Statement" type="textarea" value={content.mission_text} onChange={v => update('mission_text', v)} />
              <Field label="About Body Text" type="textarea" value={content.about_body} onChange={v => update('about_body', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">📞 Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Address" value={content.address} onChange={v => update('address', v)} />
              <Field label="Phone 1" value={content.phone} onChange={v => update('phone', v)} />
              <Field label="Phone 2" value={content.phone_2} onChange={v => update('phone_2', v)} />
              <Field label="Email 1" value={content.email} onChange={v => update('email', v)} />
              <Field label="Email 2" value={content.email_2} onChange={v => update('email_2', v)} />
              <Field label="Weekday Hours" value={content.hours} onChange={v => update('hours', v)} />
              <Field label="Saturday Hours" value={content.hours_sat} onChange={v => update('hours_sat', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Section Labels */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">🏷 Section Labels (for Programs, News, Gallery, Downloads, Contact)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Programs Tag" value={content.programs_tag} onChange={v => update('programs_tag', v)} />
              <Field label="Programs Title" value={content.programs_title} onChange={v => update('programs_title', v)} />
              <Field label="Programs Subtitle" value={content.programs_sub} onChange={v => update('programs_sub', v)} />
              <Field label="News Tag" value={content.news_tag} onChange={v => update('news_tag', v)} />
              <Field label="News Title" value={content.news_title} onChange={v => update('news_title', v)} />
              <Field label="News Subtitle" value={content.news_sub} onChange={v => update('news_sub', v)} />
              <Field label="Gallery Tag" value={content.gallery_tag} onChange={v => update('gallery_tag', v)} />
              <Field label="Gallery Title" value={content.gallery_title} onChange={v => update('gallery_title', v)} />
              <Field label="Gallery Subtitle" value={content.gallery_sub} onChange={v => update('gallery_sub', v)} />
              <Field label="Downloads Tag" value={content.downloads_tag} onChange={v => update('downloads_tag', v)} />
              <Field label="Downloads Title" value={content.downloads_title} onChange={v => update('downloads_title', v)} />
              <Field label="Downloads Subtitle" value={content.downloads_sub} onChange={v => update('downloads_sub', v)} />
              <Field label="Contact Tag" value={content.contact_tag} onChange={v => update('contact_tag', v)} />
              <Field label="Contact Title" value={content.contact_title} onChange={v => update('contact_title', v)} />
              <Field label="Contact Subtitle" value={content.contact_sub} onChange={v => update('contact_sub', v)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
