#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
count="$(runuser -u postgres -- psql -d citabox -Atc 'SELECT count(*) FROM clinics;')"
[[ "$count" == 0 ]] || { echo 'Refusing to seed: this database already contains clinics.' >&2; exit 1; }
if [[ ! -f /etc/citabox/seed.env ]]; then
  python3 - <<'PY'
import os, secrets
path = '/etc/citabox/seed.env'
names = ['MOCK_USER_PASSWORD', 'MOCK_PATIENT_PASSWORD', 'SUPER_ADMIN_PASSWORD', 'DEMO_ADMIN_PASSWORD', 'DEMO_DOCTOR_PASSWORD', 'DEMO_STAFF_PASSWORD']
with open(path, 'x') as config:
    for name in names:
        config.write(f'{name}={secrets.token_urlsafe(24)}\n')
os.chmod(path, 0o600)
PY
fi
set -a
source /etc/citabox/api.env
source /etc/citabox/seed.env
set +a
runuser -u citabox -- bash -c 'cd /opt/citabox/current && node dist/prisma/seed.js'
echo 'Demo data ready. Credentials are in /etc/citabox/seed.env (root only).'
