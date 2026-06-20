-- Sync library_student_of_month with Meta-approved MARKETING template (not Utility)
UPDATE whatsapp_templates SET
  template_status = 'approved',
  template_category = 'MARKETING',
  template_content = '🌟 *Student of the Month*

Congratulations *{{1}}*!

You are the *{{3}}* winner for *{{2}}* at BR Ambedkar Library.

Your achievement: *{{4}}*

Keep up the excellent work!

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
  footer_text = 'This is an automated message. Please do not reply.',
  variables = '[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"June 2026"},{"name":"{{3}}","type":"text","example":"Longest Streak This Month"},{"name":"{{4}}","type":"text","example":"5 days in a row"}]'::jsonb,
  updated_at = NOW()
WHERE template_name = 'library_student_of_month' AND template_language = 'en' AND org_id = 'library';
