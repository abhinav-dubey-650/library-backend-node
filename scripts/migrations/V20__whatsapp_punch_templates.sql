-- Meta-approved punch in/out templates

INSERT INTO whatsapp_templates (
    template_name, template_language, template_status, template_category,
    template_content, footer_text, variables, org_id
) VALUES
(
    'library_punchin',
    'en',
    'approved',
    'UTILITY',
    '🟢 *Punch In Successful*

Dear {{1}},

Your attendance has been recorded successfully.

⏰ Punch In Time: {{2}}
📍 Location: {{3}}

Have a productive study session at *BR Ambedkar Library*.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
    'This is an automated message. Please do not reply.',
    '[{"name":"{{1}}","type":"text","example":"Abhinav"},{"name":"{{2}}","type":"text","example":"8:00 AM"},{"name":"{{3}}","type":"text","example":"BR Ambedkar Library, Nadipar"}]'::jsonb,
    'library'
),
(
    'library_punchout',
    'en',
    'approved',
    'UTILITY',
    '🔴 *Punch Out Successful*

Dear {{1}},

Your attendance has been recorded successfully.

🟢 Punch In: {{2}}
🔴 Punch Out: {{3}}
⏳ Total Study Time: {{4}}

Thank you for visiting *BR Ambedkar Library*.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School,  Japla*',
    'This is an automated message. Please do not reply.',
    '[{"name":"{{1}}","type":"text","example":"Abhinav"},{"name":"{{2}}","type":"text","example":"8:00 AM"},{"name":"{{3}}","type":"text","example":"2:01 PM"},{"name":"{{4}}","type":"text","example":"6 hrs 1 min"}]'::jsonb,
    'library'
)
ON CONFLICT (template_name, template_language, org_id) DO UPDATE SET
    template_status = EXCLUDED.template_status,
    template_category = EXCLUDED.template_category,
    template_content = EXCLUDED.template_content,
    footer_text = EXCLUDED.footer_text,
    variables = EXCLUDED.variables,
    updated_at = NOW();
