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

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof SiteContentType; type?: string }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {type === 'textarea' ? (
        <Textarea
          value={content[field] as string}
          onChange={e => update(field, e.target.value)}
          rows={3}
        />
      ) : (
        <Input
          value={content[field] as string}
          onChange={e => update(field, e.target.value)}
        />
      )}
    </div>
  );

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
              <Field label="Badge Text" field="hero_badge" />
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Title (Line 1)" field="hero_title_1" />
                <Field label="Title (Gold Highlight)" field="hero_title_2" />
              </div>
              <Field label="Subtitle" field="hero_title_sub" />
              <Field label="Description" field="hero_desc" type="textarea" />
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">📖 About Section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Section Tag" field="about_tag" />
              <Field label="Section Title" field="about_title" />
              <Field label="Section Subtitle" field="about_sub" />
              <Field label="Vision Statement" field="vision_text" type="textarea" />
              <Field label="Mission Statement" field="mission_text" type="textarea" />
              <Field label="About Body Text" field="about_body" type="textarea" />
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">📞 Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Address" field="address" />
              <Field label="Phone 1" field="phone" />
              <Field label="Phone 2" field="phone_2" />
              <Field label="Email 1" field="email" />
              <Field label="Email 2" field="email_2" />
              <Field label="Weekday Hours" field="hours" />
              <Field label="Saturday Hours" field="hours_sat" />
            </div>
          </CardContent>
        </Card>

        {/* Section Labels */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-navy">🏷 Section Labels (for Programs, News, Gallery, Downloads, Contact)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Programs Tag" field="programs_tag" />
              <Field label="Programs Title" field="programs_title" />
              <Field label="Programs Subtitle" field="programs_sub" />
              <Field label="News Tag" field="news_tag" />
              <Field label="News Title" field="news_title" />
              <Field label="News Subtitle" field="news_sub" />
              <Field label="Gallery Tag" field="gallery_tag" />
              <Field label="Gallery Title" field="gallery_title" />
              <Field label="Gallery Subtitle" field="gallery_sub" />
              <Field label="Downloads Tag" field="downloads_tag" />
              <Field label="Downloads Title" field="downloads_title" />
              <Field label="Downloads Subtitle" field="downloads_sub" />
              <Field label="Contact Tag" field="contact_tag" />
              <Field label="Contact Title" field="contact_title" />
              <Field label="Contact Subtitle" field="contact_sub" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
