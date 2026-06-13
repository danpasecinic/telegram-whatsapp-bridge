#!/usr/bin/env bash
#
# On-demand deploy of the local working tree to the EC2 host.
#
# Syncs the build-relevant files over SSH (rsync), then rebuilds and restarts
# the Docker container on the box. Mirrors the steps in
# .github/workflows/deploy.yml but runs from your machine for any branch /
# uncommitted changes -- no git push or merge to main required.
#
# Configuration (env vars, or a gitignored scripts/.env.deploy file):
#   EC2_HOST     required. Hostname or IP of the EC2 instance.
#   EC2_USER     SSH user.            default: ec2-user
#   SSH_KEY      path to private key. default: ssh default (~/.ssh/...)
#   REMOTE_DIR   dir on the box.      default: telegram-whatsapp-bridge
#   IMAGE_NAME   docker image tag.    default: tg-wa-bridge
#
# Usage:
#   scripts/deploy.sh            # deploy current working tree, with confirmation
#   scripts/deploy.sh -y         # skip the confirmation prompt
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- load optional config file -------------------------------------------------
if [[ -f scripts/.env.deploy ]]; then
  # shellcheck disable=SC1091
  set -a && source scripts/.env.deploy && set +a
fi

EC2_HOST="${EC2_HOST:?EC2_HOST is required (set it in scripts/.env.deploy or the environment)}"
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY="${SSH_KEY:-}"
REMOTE_DIR="${REMOTE_DIR:-telegram-whatsapp-bridge}"
IMAGE_NAME="${IMAGE_NAME:-tg-wa-bridge}"

ASSUME_YES=0
[[ "${1:-}" == "-y" || "${1:-}" == "--yes" ]] && ASSUME_YES=1

for bin in ssh rsync; do
  command -v "$bin" >/dev/null 2>&1 || { echo "error: '$bin' not found in PATH" >&2; exit 1; }
done

SSH_TARGET="${EC2_USER}@${EC2_HOST}"

# SSH refuses keys that are readable by other users; fix it up front.
if [[ -n "$SSH_KEY" && -f "$SSH_KEY" ]]; then
  perms="$(stat -f '%Lp' "$SSH_KEY" 2>/dev/null || stat -c '%a' "$SSH_KEY" 2>/dev/null || echo '')"
  if [[ "$perms" != "600" && "$perms" != "400" ]]; then
    echo ">> Tightening key permissions on '$SSH_KEY' (was ${perms:-unknown})"
    chmod 600 "$SSH_KEY"
  fi
fi

# Build ssh options as an array so paths with spaces survive.
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
[[ -n "$SSH_KEY" ]] && SSH_OPTS+=(-i "$SSH_KEY")

# rsync wants the remote shell as one -e string; quote each option safely.
RSH="ssh"
for opt in "${SSH_OPTS[@]}"; do RSH+=" $(printf '%q' "$opt")"; done

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(no-git)')"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
DIRTY=""
git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null || DIRTY=" (uncommitted changes included)"

cat <<INFO
About to deploy to EC2:
  target   : ${SSH_TARGET}:${REMOTE_DIR}
  branch   : ${BRANCH} @ ${COMMIT}${DIRTY}
  image    : ${IMAGE_NAME}
  note     : container is stopped during rebuild (brief downtime)
             WhatsApp session is wiped -- a fresh QR scan is required after deploy
INFO

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Proceed? [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

echo ">> Syncing files to ${SSH_TARGET}:${REMOTE_DIR}/ ..."
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'data' \
  --exclude 'logs' \
  --exclude '.env' \
  --exclude '.env.deploy' \
  --exclude '.wwebjs_auth' \
  --exclude '.wwebjs_cache' \
  --exclude '.idea' \
  -e "$RSH" \
  ./ "${SSH_TARGET}:${REMOTE_DIR}/"

echo ">> Rebuilding and restarting on the host ..."
# shellcheck disable=SC2087
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_DIR}"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

\$DC down || true
sudo rm -rf data/wwebjs_auth .wwebjs_cache
docker build --no-cache -t "${IMAGE_NAME}" .
\$DC up -d --no-build
docker image prune -f
REMOTE

echo ">> Deploy complete."
echo ">> Watch logs / scan the QR code with:"
echo "   ssh ${SSH_OPTS[*]} $SSH_TARGET 'cd ${REMOTE_DIR} && docker compose logs -f bridge'"
