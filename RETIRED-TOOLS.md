# Retired tools

PPT narration and FYP exercise testing were retired on 2026-10-27. Their source
is preserved in Git history and their standalone GitHub repositories are archived.
They are intentionally absent from the apps page and production deployment.
Their systemd services are disabled/stopped and nginx returns 410 for the old
public paths. Do not reintroduce their vulnerable runtimes via a deployment.
