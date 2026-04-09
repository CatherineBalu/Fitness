Create a new git branch following the project's naming convention.

1. If the user has not provided both their xlogin and Jira epic in $ARGUMENTS, ask for them now:
   - xlogin: their university login (e.g. `xkolar8`)
   - Jira epic: the task identifier (e.g. `NUE-21`)

2. Construct the branch name as `xlogin/EPIC-ID` (e.g. `xkolar8/NUE-21`).

3. Run `git checkout -b <branch-name>` from the repo root.

4. Confirm the branch was created and remind the user that commit messages on this branch should follow the format:
   `EPIC-ID: <type>: <description>` (e.g. `NUE-21: add: login button`)
