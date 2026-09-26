# ARCH CLI (beta)

The name `arch` is already occupied on PyPI, so this distribution is named **arch-cli**;
it installs the `arch` executable. Install locally with `pip install ./clients/python`.
A tag-triggered TestPyPI → PyPI workflow is included, but publishing requires the
repository environments and tokens described in `docs/V5-YOUR-CHECKLIST.md`.

Create an API token as an OWNER/ADMIN with `POST /api/v1/tokens` from an authenticated
browser session. Copy the returned `token` immediately: it is never returned again.
Run `arch login --url https://your-arch-host --token ...` (omit `--token` to use a
hidden prompt). Credentials are stored in `~/.config/arch/credentials` (or
`$XDG_CONFIG_HOME/arch/credentials`) with mode 600. Do not pass a token on a
shared shell command line. `arch org use <slug>` resolves the token’s organization. Browser/device login is not implemented yet.

Commands: `arch incidents list|create|show|follow|update|triage`, `arch status show`,
`arch tokens create|revoke`. Use `arch --json incidents list` for scripting.
Incident creation requires `--project` (project ID), and optionally `--service` (service ID).
A READ token cannot mutate. Errors are printed as `API_CODE: message`.
