<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep email/password login at `/login`; public signup/recovery routes are absent because accounts are administered internally.
- Login-specific semantic tokens in `src/styles.css` and the Button login variant isolate its branding from operational screens.
- News requests return bounded pages from a short-lived server feed cache; load additional pages only on demand to limit transfers and repeated RSS requests.
- Quiz scores, cumulative progression and idempotent game sessions use RLS-protected public tables and an authenticated score RPC; keep generated types synchronized through applied migrations to prevent schema drift.
- Apply operational appearance through semantic CSS token overrides on the document; restore the browser preference after hydration and keep login branding isolated to avoid changing authentication visuals.
- Prebundle React, React DOM and JSX runtimes together with UI dependencies in Vite to prevent mixed React instances during live dependency updates.
- Account creation and revocation use authenticated server functions that verify the caller's stored access level before loading the privileged client; browser role writes and public signup are forbidden.
- Cloud access assignments use `user_roles.user_id`, `display_name`, `email`, and `role`; preserve the existing access-level meanings.
- Registration editors update records by stable ID through the existing store/API and reuse creation validation; operational edits are RLS-protected, while account edits use authenticated administrator-only server functions.
- Preserve authentication context identity through Vite hot data during Fast Refresh so mounted providers and updated consumers cannot diverge.
- Validate restored sessions with getUser before exposing them; clear invalid sessions locally and ignore cached INITIAL_SESSION events so expired credentials cannot bypass or block login.
- Hydrate registered operational stores from Cloud after validating the user's access and before exposing private screens; this ensures saved data survives reloads.
- Serialize Cloud writes per operational namespace; losses registration/import/edit must await durable save before clearing inputs or reporting success, and the Dashboard reads the same hydrated cadastro store.
- Use the generated browser client and private Storage API with RLS for OS and supervision attachments; legacy Edge URLs and NEXT_PUBLIC configuration are not part of the active Cloud connection.
- Repair requests live in `repair_requests` + private `repair-images` bucket; the page reuses OS form parts (src/components/os-form-parts.tsx) and the OS PDF template (baixarPdfReparo) — why: one shared look and OCR flow.
- OS and repair exports share the rendering primitives, including signatures, in `os-pdf-template.ts`; report-specific generators only map their fields and block order — why: grids, typography, page breaks, signature spacing and attachment frames must not diverge.
