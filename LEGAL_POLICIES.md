# Legal policy management

1. Open Supabase Dashboard → SQL Editor and run `supabase/legal_policies.sql`.
   This creates the table, validation trigger, public read access and admin-only
   insert/update access, and seeds all four pages with the existing policy text.
   Re-running the script preserves existing published edits.
2. Deploy the code changes.
3. Log in at `/admin/login`, then open **Legal Policies** (`/legal-policies`).
4. Choose a page, edit its title, introduction and sections, and click
   **Save & publish**. Open or refresh the public page to see the saved version.

Public URLs: `/terms`, `/privacy`, `/refund-policy`, `/merchant-agreement`.

The editor uses the existing admin login cookie and Supabase Row Level Security.
Only users present in `public.admin` with `id = auth.uid()` can publish. Ordinary
merchants and anonymous visitors can only read. No service-role key is exposed.
Text is rendered as plain text, with preserved line breaks, without HTML execution.
The public pages render dynamically and do not require a redeploy for policy edits.
Before the migration is installed, the public pages retain their existing text;
the admin editor displays a setup error if the table cannot be accessed.
