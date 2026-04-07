Commit all changed files following the project's commit message convention.

1. Run `git branch --show-current` to get the current branch name and extract the Jira epic ID from it (the part after the `/`, e.g. `xkolar8/NUE-21` → `NUE-21`). If the branch name doesn't match the `xlogin/EPIC-ID` format, ask the user for the epic ID manually.

2. Run `git status` to show the user what files will be staged and committed.

3. If the user has not provided a commit type and description in $ARGUMENTS, ask for them:
   - Type: one of `add`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`
   - Short description: what the commit does (e.g. `login button component`)

4. Construct the commit message as `EPIC-ID: <type>: <description>` (e.g. `NUE-21: add: login button component`).

5. Run `git add -A` to stage all changed files, then `git commit -m "<message>"`.

6. Confirm the commit was created and show the final commit message used.
