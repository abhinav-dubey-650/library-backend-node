-- All approved WhatsApp templates for library notifications

INSERT INTO whatsapp_templates (template_name, template_language, template_status, template_category, template_content, footer_text, variables, org_id) VALUES
('library_fee_generated', 'en', 'approved', 'UTILITY',
'💰 *Fee Invoice Generated*

Dear {{1}},

Your library fee for *{{2}}* has been generated.

📋 Amount: ₹{{3}}
📅 Due Date: 10th of this month
💳 Amount Pending: ₹{{4}}

Please pay at the library reception before the due date.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"June 2026"},{"name":"{{3}}","type":"text","example":"1000"},{"name":"{{4}}","type":"text","example":"1000"}]'::jsonb,
'library'),
('library_payment_received', 'en', 'approved', 'UTILITY',
'✅ *Payment Received*

Dear *{{1}}*,

We have recorded your fee payment.

💵 Amount Paid: *₹{{2}}*
📋 Invoice: *{{3}}*
💳 Remaining Balance: *₹{{4}}*

Thank you for your payment.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"500"},{"name":"{{3}}","type":"text","example":"June 2026"},{"name":"{{4}}","type":"text","example":"1300"}]'::jsonb,
'library'),
('library_fee_reminder', 'en', 'approved', 'UTILITY',
'⏰ *Fee Reminder*

Dear *{{1}}*,

This is a reminder for your library fee.

📋 Month: *{{2}}*
💳 Amount Pending: *₹{{3}}*

Please visit the library reception to complete your payment.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"June 2026"},{"name":"{{3}}","type":"text","example":"1300"}]'::jsonb,
'library'),
('library_achievement', 'en', 'approved', 'MARKETING',
'🏆 *Achievement Unlocked!*

Congratulations *{{1}}*!

You earned: *{{2}}*

*{{3}}*

Keep studying — {{4}} of *{{5}}* badges unlocked.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"7 Day Streak"},{"name":"{{3}}","type":"text","example":"Study at the library 7 days in a row"},{"name":"{{4}}","type":"text","example":"8"},{"name":"{{5}}","type":"text","example":"42"}]'::jsonb,
'library'),
('library_subscription_expiry', 'en', 'approved', 'UTILITY',
'📅 *Membership Expiring Soon*

Dear *{{1}}*,

Your library membership is expiring soon.

📋 Plan: *{{2}}*
📅 Valid Until: *{{3}}*

Please contact the library office to renew and avoid interruption.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"Monthly Morning Plan"},{"name":"{{3}}","type":"text","example":"30 Jun 2026"}]'::jsonb,
'library'),
('library_exam_countdown', 'en', 'approved', 'UTILITY',
'🎯 Exam Reminder

Dear *{{1}}*,

Your exam is approaching. Please note the details below:

📝 Exam: *{{2}}*
📅 Date: *{{3}}*
⏳ Days Left: *{{4}}*

Stay focused on your studies and make good use of the time left for preparation.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"NEET 2026"},{"name":"{{3}}","type":"text","example":"05 May 2026"},{"name":"{{4}}","type":"text","example":"7"}]'::jsonb,
'library'),
('library_admin_new_member', 'en', 'approved', 'UTILITY',
'👤 *Library Membership Confirmation*

Dear *{{1}}*,

Your library membership has been successfully registered.

Here are your membership details:

• Member ID: *{{2}}*
• Plan: *{{3}}*
• Seat Number: *{{4}}*
• Registered Mobile Number: *{{5}}*

Please keep these details safe for future reference.

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rakesh"},{"name":"{{2}}","type":"text","example":"BRL001"},{"name":"{{3}}","type":"text","example":"Monthly Morning Plan"},{"name":"{{4}}","type":"text","example":"23"},{"name":"{{5}}","type":"text","example":"8529562910"}]'::jsonb,
'library'),
('library_student_of_month', 'en', 'approved', 'MARKETING',
'🌟 *Student of the Month*

Congratulations *{{1}}*!

You are the *{{3}}* winner for *{{2}}* at BR Ambedkar Library.

Your achievement: *{{4}}*

Keep up the excellent work!

📚 *BR Ambedkar Library, Nadipar*
*Unit of Udayan Public School, Japla*',
'This is an automated message. Please do not reply.',
'[{"name":"{{1}}","type":"text","example":"Rahul Sharma"},{"name":"{{2}}","type":"text","example":"May 2026"},{"name":"{{3}}","type":"text","example":"Highest Study Hours"},{"name":"{{4}}","type":"text","example":"120h"}]'::jsonb,
'library')
ON CONFLICT (template_name, template_language, org_id) DO UPDATE SET
  template_status = EXCLUDED.template_status,
  template_category = EXCLUDED.template_category,
  template_content = EXCLUDED.template_content,
  footer_text = EXCLUDED.footer_text,
  variables = EXCLUDED.variables,
  updated_at = NOW();
