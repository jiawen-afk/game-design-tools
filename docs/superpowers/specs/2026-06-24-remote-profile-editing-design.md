# Remote Profile Editing Design

## Goal

Project remote database and Kodo profiles should be edited deliberately: users select an existing profile to update it, use an explicit add action to create a new one, and save only after testing the current draft.

## Interaction

- Selecting a database profile fills provider, host, port, database, username, and SSL. Password stays empty with helper text: empty means keep the saved password.
- Selecting a Kodo profile fills Access Key, bucket, region, and domain. Secret Key stays empty with helper text: empty means keep the saved Secret Key.
- Add profile clears selection, resets the draft, and switches the save action to create mode.
- Editing any field marks the draft as untested.
- Save is disabled while the current draft has not been tested.
- A successful test saves immediately.
- A failed test enables a confirmation flow. If the user confirms, the profile is saved; if they cancel, nothing is written.
- New profiles require password or Secret Key. Existing profiles may leave those fields empty to preserve the stored secret.

## Data Handling

- Profile lists remain summaries only.
- A new editable-profile read returns non-secret fields and intentionally redacts password and Secret Key to empty strings.
- Save accepts an optional profile id. When updating an existing profile, empty password or Secret Key is merged from the previous encrypted payload before writing.
- Verification uses the saved profile id so remote checks still exercise the real persisted configuration.

## Verification

- Unit tests cover editable draft redaction, update-time secret preservation, and create-time secret requirements.
- Structure tests cover the new add buttons, helper text, failed-test confirmation save path, and desktop bridge methods.
