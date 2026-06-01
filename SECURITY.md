# Security Policy

## Supported Versions

The latest release on the `main` branch is supported.

## Reporting a Vulnerability

Please report security issues privately to the repository owner instead of opening a public issue.

Do not include real credentials, private environment files, or production secrets in issues, pull requests, screenshots, or example configs.

## Secrets and Configuration

Runtime configuration belongs in `.env.local`, which is ignored by git. Use `.env.example` as the safe template for documented environment variables.

Firebase Web SDK identifiers, including `apiKey`, are public project identifiers. They are not authentication secrets, but access to Firebase services must still be protected with Security Rules and Authentication.
