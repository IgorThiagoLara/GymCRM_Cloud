set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
sync() {
  local svc="$1"; shift
  local dest="$ROOT/services/$svc/src/shared"
  rm -rf "$dest"; mkdir -p "$dest"
  for m in "$@"; do cp -r "$ROOT/shared-kernel/$m" "$dest/$m"; done
  echo "synced $svc: $*"
}
sync cadastros-service   kernel http events
sync matriculas-service  kernel http events messaging persistence
sync financeiro-service  kernel http events messaging persistence
sync notificacoes-service kernel http events messaging persistence
