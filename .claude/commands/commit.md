Commit all changed files following the project's commit message convention.

1. Run `git branch --show-current` to get the current branch name and extract the Jira epic ID from it (the part after the `/`, e.g. `xkolar8/NUE-21` → `NUE-21`). If the branch name doesn't match the `xlogin/EPIC-ID` format, ask the user for the epic ID manually.

2. Run `git status` to show the user what files will be staged and committed.

3. **Run linting and formatting checks** on the relevant package(s) based on which files are changed:
   - If any `frontend/` files are changed: run `npm run lint` and `npm run format:check` from the `frontend/` directory.
   - If any `backend/` files are changed: run `bun run lint` and `bun run format:check` from the `backend/` directory.
   - Show the output to the user. If there are any errors or formatting issues, **ask the user for permission** before auto-fixing them.
   - If the user approves, run `npm run format:write` (frontend) and/or `bun run format:write` (backend) to fix formatting, then re-run lint to confirm it passes.
   - Do not proceed to commit if lint errors remain unfixed.

4. If the user has not provided a commit type and description in $ARGUMENTS, ask for them:
   - Type: one of `add`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`
   - Short description: what the commit does (e.g. `login button component`)

5. Construct the commit message as `EPIC-ID: <type>: <description>` (e.g. `NUE-21: add: login button component`).

6. Run `git add -A` to stage all changed files, then `git commit -m "<message>"`.

7. Confirm the commit was created and show the final commit message used.
