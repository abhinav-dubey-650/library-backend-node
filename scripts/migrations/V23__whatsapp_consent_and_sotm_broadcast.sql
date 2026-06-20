-- Force WhatsApp consent on for all users (library manages consent at admission)
UPDATE users SET whatsapp_consent = true WHERE whatsapp_consent IS DISTINCT FROM true;

-- Broadcast template: announce Student of the Month winners to entire library
INSERT INTO whatsapp_templates (template_name, template_language, template_status, template_category, template_content, footer_text, variables, org_id) VALUES
('library_sotm_broadcast', 'en', 'approved', 'MARKETING',
'🌟 *Student of the Month*

*{{1}}* (Member ID: *{{2}}*) is the *{{4}}* winner for *{{3}}* at BR Ambedkar Library.

Achievement: *{{5}}*

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"BRL001"},{"name":"{{3}}","type":"text","example":"May 2026"},{"name":"{{4}}","type":"text","example":"Highest Study Hours"},{"name":"{{5}}","type":"text","example":"120h"}]'::jsonb,
'library')
ON CONFLICT (template_name, template_language, org_id) DO UPDATE SET
  template_status = EXCLUDED.template_status,
  template_category = EXCLUDED.template_category,
  template_content = EXCLUDED.template_content,
  footer_text = EXCLUDED.footer_text,
  variables = EXCLUDED.variables,
  updated_at = NOW();
