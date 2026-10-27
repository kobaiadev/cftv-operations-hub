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
- Account creation and revocation use authenticated server functions that verify the caller's stored access level before loading the privileged client; browser role writes and public signup are forbidden.
- Cloud access assignments use `user_roles.user_id`, `display_name`, `email`, and `role`; preserve the existing access-level meanings.
