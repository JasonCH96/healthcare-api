#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
id citabox &>/dev/null || useradd --system --create-home --home-dir /var/lib/citabox --shell /usr/sbin/nologin citabox
id citabox-deploy &>/dev/null || useradd --create-home --shell /bin/bash citabox-deploy
install -d -m 0755 /opt/citabox /opt/citabox/releases
install -d -o citabox-deploy -g citabox-deploy -m 0700 /opt/citabox/incoming
install -d -o root -g citabox -m 0750 /etc/citabox
install -d -o citabox -g citabox -m 0700 /var/cache/citabox /var/cache/citabox/puppeteer

if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != 22 ]]; then
  tmp="$(mktemp -d)"
  curl -fsS https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$tmp/SHASUMS256.txt"
  filename="$(awk '/ node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' "$tmp/SHASUMS256.txt")"
  [[ "$filename" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-x64.tar.xz$ ]] || exit 1
  curl -fsS "https://nodejs.org/dist/latest-v22.x/$filename" -o "$tmp/$filename"
  (cd "$tmp"; grep " $filename$" SHASUMS256.txt | sha256sum --check -)
  tar -xJf "$tmp/$filename" -C /opt
  node_dir="/opt/${filename%.tar.xz}"
  ln -sfn "$node_dir/bin/node" /usr/local/bin/node
  ln -sfn "$node_dir/bin/npm" /usr/local/bin/npm
  ln -sfn "$node_dir/bin/npx" /usr/local/bin/npx
fi

if [[ ! -f /etc/citabox/api.env ]]; then
  password="$(openssl rand -hex 32)"
  jwt_secret="$(openssl rand -hex 48)"
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE citabox LOGIN PASSWORD '$password';"
  runuser -u postgres -- createdb --owner=citabox citabox
  umask 077
  cat > /etc/citabox/api.env <<ENV
NODE_ENV=production
HOST=${API_LISTEN_HOST:-127.0.0.1}
PORT=3001
DATABASE_URL=postgresql://citabox:${password}@127.0.0.1:5432/citabox
JWT_SECRET=${jwt_secret}
CORS_ORIGINS=
FRONTEND_URL=
ENABLE_SWAGGER=false
PUPPETEER_CACHE_DIR=/var/cache/citabox/puppeteer
ENV
  chown root:citabox /etc/citabox/api.env
  chmod 0640 /etc/citabox/api.env
fi

install -m 0755 "$script_dir/activate.sh" /usr/local/sbin/citabox-activate
install -m 0755 "$script_dir/backup.sh" /usr/local/sbin/citabox-backup
install -m 0644 "$script_dir/citabox-api.service" /etc/systemd/system/citabox-api.service
install -m 0644 "$script_dir/citabox-backup.service" /etc/systemd/system/citabox-backup.service
install -m 0644 "$script_dir/citabox-backup.timer" /etc/systemd/system/citabox-backup.timer
printf '%s\n' 'citabox-deploy ALL=(root) NOPASSWD: /usr/local/sbin/citabox-activate *' > /etc/sudoers.d/citabox-deploy
chmod 0440 /etc/sudoers.d/citabox-deploy
visudo -cf /etc/sudoers.d/citabox-deploy
systemctl daemon-reload
systemctl enable citabox-api
systemctl enable --now citabox-backup.timer
echo 'CitaBox runtime provisioned. Configure api.env and the HTTPS route before publishing.'
