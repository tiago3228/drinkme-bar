<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Application architecture

- Keep public pages in top-level TanStack routes and member/admin pages under the managed authenticated layout, so paid content is never served by public loaders.
- Use authenticated server functions and database RLS for administrative operations; keep roles separate from editable profiles to prevent escalation.
- Store all uploaded media privately with resource-scoped signed URLs; public site media is explicitly marked public, because public buckets are blocked by workspace policy.
- Deliver home photos through server-side storage signing only after a public-RLS lookup verifies the configured resource is explicitly public and a supported raster image; no anonymous storage-object policy is needed.
- Render the ambient audio controls inside ClientOnly to prevent a server-rendered player remaining beside the hydrated player when music query data differs.
- Keep reusable public layout and content-driven views in components, with all visual tokens in the global stylesheet, so administrators can update content without code edits.
- Allow public reads of site_settings only for the `home` key; other settings require an administrator to prevent accidental disclosure of future internal configuration.
