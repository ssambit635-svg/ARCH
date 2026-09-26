import time
import click
from . import config
from .auth import store_token
from .api import request, ApiError
from .formatters import display


class ApiGroup(click.Group):
    def invoke(self, ctx):
        try:
            return super().invoke(ctx)
        except ApiError as exc:
            raise click.ClickException(f"{exc.code}: {exc}") from exc


@click.group(cls=ApiGroup)
@click.option("--json", "as_json", is_flag=True, help="Print machine-readable JSON")
@click.pass_context
def cli(ctx, as_json):
    ctx.ensure_object(dict)
    ctx.obj["json"] = as_json


@cli.command()
@click.option("--token", prompt=True, hide_input=True, help="API token created by an organization admin")
@click.option("--url", prompt=True, default="https://arch.example.com", help="ARCH server URL")
def login(token, url):
    """Store an API token locally (browser/device authorization is not yet available)."""
    if not token.startswith("arch_"):
        raise click.ClickException("Expected an ARCH API token")
    store_token(token, url)
    click.echo("Credentials saved with mode 600.")


@cli.group()
def org():
    pass


@org.command("use")
@click.argument("slug")
def org_use(slug):
    """Select your organization by slug."""
    organizations = request("GET", "organizations")
    match = next((item for item in organizations if item["slug"] == slug), None)
    if match is None:
        raise click.ClickException("Organization not found for this token")
    data = config.load()
    data["organization_id"] = match["id"]
    config.save(data)


@cli.group()
def incidents():
    pass


@incidents.command("list")
@click.option("--status")
@click.option("--severity")
@click.option("--project", "project_id")
@click.pass_context
def incident_list(ctx, status, severity, project_id):
    display(request("GET", "incidents", params={k: v for k, v in {"status": status, "severity": severity, "projectId": project_id}.items() if v}), ctx.obj["json"])


@incidents.command("create")
@click.option("--title", required=True)
@click.option("--severity", default="MEDIUM")
@click.option("--project", "project_id", required=True, help="Project ID")
@click.option("--service", "service_id", help="Service ID")
@click.pass_context
def incident_create(ctx, title, severity, project_id, service_id):
    display(request("POST", "incidents", body={k: v for k, v in {"title": title, "severity": severity.upper(), "projectId": project_id, "serviceId": service_id}.items() if v}), ctx.obj["json"])


@incidents.command("show")
@click.argument("incident_id")
@click.pass_context
def incident_show(ctx, incident_id):
    display(request("GET", f"incidents/{incident_id}"), ctx.obj["json"])
    display(request("GET", f"incidents/{incident_id}/timeline"), ctx.obj["json"])


@incidents.command("follow")
@click.argument("incident_id")
@click.option("--interval", type=click.IntRange(min=2), default=5)
@click.pass_context
def incident_follow(ctx, incident_id, interval):
    seen = set()
    while True:
        result = request("GET", f"incidents/{incident_id}/timeline")
        for event in reversed(result.get("items", [])):
            if event["id"] not in seen:
                display(event, ctx.obj["json"])
                seen.add(event["id"])
        time.sleep(interval)


@incidents.command("update")
@click.argument("incident_id")
@click.option("--status", required=True)
@click.pass_context
def incident_update(ctx, incident_id, status):
    display(request("PATCH", f"incidents/{incident_id}", body={"status": status.upper()}), ctx.obj["json"])


@incidents.command("triage")
@click.argument("incident_id")
@click.pass_context
def incident_triage(ctx, incident_id):
    display(request("POST", f"incidents/{incident_id}/copilot/triage"), ctx.obj["json"])


@cli.group()
def status():
    pass


@status.command("show")
@click.pass_context
def status_show(ctx):
    display(request("GET", "status-summary"), ctx.obj["json"])


@cli.group()
def tokens():
    pass


@tokens.command("create")
@click.option("--name", required=True)
@click.option("--scope", type=click.Choice(["READ", "READ_WRITE"]), default="READ")
@click.pass_context
def tokens_create(ctx, name, scope):
    display(request("POST", "tokens", body={"name": name, "scopes": [scope]}), ctx.obj["json"])


@tokens.command("revoke")
@click.argument("token_id")
@click.pass_context
def tokens_revoke(ctx, token_id):
    display(request("DELETE", f"tokens/{token_id}"), ctx.obj["json"])


if __name__ == "__main__":
    cli()
