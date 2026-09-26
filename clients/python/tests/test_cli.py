from click.testing import CliRunner
from arch_cli.main import cli
from arch_cli import config


def test_login_creates_private_credentials(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "PATH", tmp_path / "arch" / "credentials")
    result = CliRunner().invoke(cli, ["login", "--token", "arch_example", "--url", "https://example.test"])
    assert result.exit_code == 0, result.output
    assert config.PATH.stat().st_mode & 0o777 == 0o600
    assert config.load()["token"] == "arch_example"


def test_missing_credentials_is_coded_error(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "PATH", tmp_path / "missing")
    result = CliRunner().invoke(cli, ["incidents", "list"])
    assert result.exit_code != 0
    assert "UNAUTHORIZED" in result.output


def test_org_slug_resolves_and_sends_bearer(tmp_path, monkeypatch):
    from arch_cli import api
    monkeypatch.setattr(config, "PATH", tmp_path / "credentials")
    config.save({"token": "arch_example", "url": "https://staging.test"})
    captured = {}

    def fake_request(method, url, **kwargs):
        captured.update(method=method, url=url, headers=kwargs["headers"])
        import httpx
        return httpx.Response(200, json={"data": [{"slug": "demo", "id": "org_123"}]})

    monkeypatch.setattr(api.httpx, "request", fake_request)
    result = CliRunner().invoke(cli, ["org", "use", "demo"])
    assert result.exit_code == 0, result.output
    assert config.load()["organization_id"] == "org_123"
    assert captured == {"method": "GET", "url": "https://staging.test/api/v1/organizations", "headers": {"Authorization": "Bearer arch_example"}}


def test_api_error_code_and_no_cookie(tmp_path, monkeypatch):
    from arch_cli import api
    import httpx
    monkeypatch.setattr(config, "PATH", tmp_path / "credentials")
    config.save({"token": "arch_example", "url": "https://staging.test"})

    def fake_request(method, url, **kwargs):
        assert "Cookie" not in kwargs["headers"]
        return httpx.Response(403, json={"error": {"code": "FORBIDDEN", "message": "No access"}})

    monkeypatch.setattr(api.httpx, "request", fake_request)
    result = CliRunner().invoke(cli, ["incidents", "list"])
    assert result.exit_code != 0
    assert "FORBIDDEN: No access" in result.output
