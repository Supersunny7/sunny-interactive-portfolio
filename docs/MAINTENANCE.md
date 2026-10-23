# Maintenance

The public repository is a curated release. The original working website, original media, local archives and existing Netlify/Sanity bindings remain in the private working project.

1. Update the intended source files in the working project and validate the change there.
2. Synchronize the corresponding public source files. Keep the repository's self-contained build manifest and environment-only deployment configuration.
3. Add any new required frontend file to `release/frontend-files.json`.
4. Run `npm --prefix cms ci` and `npm run check` from a clean checkout; verify the local browser preview.
5. Review `git diff` and scan staged files for credentials or private documents before committing and pushing.
6. Deploy through the owner's existing authorized workflow when a production update is intended, then verify the public URL. A GitHub push alone is not a deployment.

The fallback deliberately remains a tested content snapshot. Refreshing it requires checking all factual content and updating the migration tests' fixture expectations. Do not include `.env`, Netlify/Sanity state directories, generated private bundles, raw resumes or local validation logs in a public commit.
