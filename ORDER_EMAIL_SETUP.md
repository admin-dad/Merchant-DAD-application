# Order confirmation emails

Emails are sent directly through Gmail SMTP, to the authenticated merchant account email. No email-delivery service is used.

1. Run `supabase/order_confirmation_email.sql` in Supabase SQL Editor.
2. Set server-only deployment environment variables:
   - `GMAIL_SMTP_USER`: your Gmail sender address.
   - `GMAIL_SMTP_APP_PASSWORD`: the Gmail app password (no spaces).
3. Redeploy. Never prefix these variables with NEXT_PUBLIC_.
4. Place a test order and verify delivery to the registered merchant email.

The orders table records confirmation_email_status and confirmation_email_sent_at. Pending/failed requests can be retried through the authenticated confirmation endpoint. A sending status left by a terminated process needs review before retry to avoid duplicate emails.
