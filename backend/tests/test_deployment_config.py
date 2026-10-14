"""Deployment safety policy tests; no live server required."""
import unittest

from deployment_config import DeploymentConfig, DeploymentConfigError


class DeploymentConfigTests(unittest.TestCase):
    def production(self, **changes):
        values = dict(
            mode="production", frontend_origin="https://rez.example",
            cookie_secure=True,
        )
        values.update(changes)
        return DeploymentConfig(**values)

    def test_production_origin(self):
        config = self.production()
        self.assertEqual(config.cors_origins, ["https://rez.example"])

    def test_production_requires_https(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(frontend_origin="http://rez.example")

    def test_production_requires_secure_cookie(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(cookie_secure=False)

    def test_httponly_required(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(cookie_httponly=False)

    def test_wildcard_origin_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(frontend_origin="https://*.example")

    def test_origin_path_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(frontend_origin="https://rez.example/path")

    def test_origin_credentials_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(frontend_origin="https://user:pass@rez.example")

    def test_origin_query_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(frontend_origin="https://rez.example/?x=1")

    def test_invalid_port_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(frontend_origin="https://rez.example:invalid")

    def test_samesite_none_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            self.production(cookie_samesite="none")

    def test_development_loopback(self):
        config = DeploymentConfig("development", "http://localhost:3000", False)
        self.assertEqual(config.cors_origins, ["http://localhost:3000"])

    def test_development_external_host_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            DeploymentConfig("development", "http://rez.example", False)

    def test_invalid_mode_rejected(self):
        with self.assertRaises(DeploymentConfigError):
            DeploymentConfig("preview", "https://rez.example", True)


if __name__ == "__main__":
    unittest.main()
