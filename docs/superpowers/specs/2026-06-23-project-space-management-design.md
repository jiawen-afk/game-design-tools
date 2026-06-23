# Project Space Management Design

Date: 2026-06-23
Status: Draft for user review

## Goal

Refine project space so daily asset work stays in the foreground while project creation, switching, migration, and activation move into a focused project management page.

The project space entry should open the asset workbench by default. Users should always see which project is currently enabled as the storage target, and they should explicitly enter project management when they need to create, edit, switch, migrate, or delete projects.

## Confirmed Decisions

- The default project space workbench modules are `角色`, `剧情编排`, `素材`, and `设置`.
- Project management is not the first workbench tab.
- The workbench header shows the current enabled project and a `切换项目空间` button.
- Clicking `切换项目空间` opens a separate project management page.
- Returning from project management restores the workbench module the user came from.
- A project tab click in project management only views or edits that project.
- A project card `启用` switch is the only action that changes the active storage target.
- The active project is persisted locally.
- If there is no persisted active project and exactly one project exists, that project is enabled automatically.
- Existing personal-space data migrates only into the default project.
- New projects start with empty character, storyboard, asset, group, and relation data.
- Remote projects can be created only after remote DB and Qiniu Kodo verification succeeds.
- First version supports only local-to-remote migration.

## Workbench UX

The project space workbench keeps the existing task modules as the primary surface:

- `角色`
- `剧情编排`
- `素材`
- `设置`

The header shows a compact current-project control on the right:

- Project name.
- Mode badge: `本地项目` or `远程项目`.
- Storage readiness badge where useful, such as `已启用`, `需要启用项目`, or `需要授权目录`.
- `切换项目空间` button.

The workbench reads from and writes to the enabled project only. If no project is enabled, data modules are disabled and the user is guided to project management.

## Project Management UX

Project management is a separate page inside project space, opened from `切换项目空间`.

The page uses tabs:

- The first tab is always `+`.
- Every other tab represents one project.
- Selecting a project tab opens that project's management card but does not enable it.

The `+` tab creates projects.

For a local project:

- User enters project name.
- User can use the existing local storage directory or choose one when needed.
- Creation stores a local SQLite-backed project with local object storage settings.
- If it is the only project, it is enabled automatically.

For a remote project:

- User enters project name.
- User selects or saves a PostgreSQL or MySQL database profile.
- Database profile must verify successfully.
- Remote database schema must initialize successfully.
- User selects or saves a Qiniu Kodo profile.
- Kodo profile must verify successfully for the project object prefix.
- Only after both remote DB and Kodo are verified can the project be created.

An existing project card contains:

- Editable project name.
- Mode and status badges.
- `启用` switch.
- Delete action with hard-delete confirmation.
- Local projects only: `迁移到远程` action.

启用 switch rules:

- Turning one project on disables every other project.
- Turning off the only enabled project leaves no storage target, so data modules become unavailable until another project is enabled.
- The enabled project id is persisted locally.
- If the persisted id no longer exists, fallback is: enable the only project if exactly one exists, otherwise require manual selection.

## Data Flow

Project data is scoped by the enabled project id.

On startup:

1. Load projects from local and remote repositories.
2. Load the persisted enabled project id.
3. If the persisted project exists, use it.
4. If no persisted project exists and there is exactly one project, enable it.
5. If no project exists, create the default local project and migrate legacy personal-space data into it.

When the enabled project changes:

1. Persist the active project id.
2. Load that project's character, storyboard, asset, group, and relation rows.
3. Render empty states when the project has no data.
4. Route future uploads, collections, star changes, relationships, storyboard edits, and deletes to that project.

Legacy personal-space data enters only the default project. Creating a new project never copies old data.

## Storage Boundaries

The workbench should not decide repository or object-storage implementation details.

Recommended boundaries:

- `ProjectStorage` owns project records, active project persistence, project row export/import, migration, and object storage adapters.
- A project-space hook owns workbench state, current page, active project id, and project management workflows.
- Workbench panels render and edit project-scoped data through hook actions.
- A dedicated project management component renders creation tabs and project cards.

The current `PersonalSpaceWorkspace` can remain the implementation folder for now, but the UI copy and boundaries should treat it as project space rather than personal space.

## Error Handling

- Creating a local project requires a non-empty project name.
- Creating a remote project is blocked until DB verification, schema initialization, and Kodo verification succeed.
- Failed remote verification keeps the user on the creation tab and displays the failing step.
- Migration failure keeps the local project enabled and unchanged.
- Delete requires confirmation and uses hard delete for metadata and objects.
- Failed object deletion creates cleanup tasks and reports a warning.
- If a project is deleted while enabled, active project persistence is cleared before fallback selection.

## Testing

Add or update tests for:

- Project space no longer exposes a project selector in the workbench header.
- Workbench header exposes current project and `切换项目空间`.
- Project management tabs always include a leading `+` tab.
- Project tab selection does not activate the project.
- Enabling one project disables the previous one and persists the enabled project id.
- Single-project startup auto-enables that project.
- Legacy personal-space rows migrate only to the default project.
- Remote project creation is blocked unless DB and Kodo verification are both successful.
- Workbench data operations target the enabled project id.
- Architecture guards keep repository/object-storage logic out of workspace entry components.
