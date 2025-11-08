# Mundum — local dev tasks.
# The game is fully static (HTML + ES modules + an import map to vendor/three).
# It must be served over HTTP; ES modules don't load from file://.

PORT ?= 8000
URL  := http://localhost:$(PORT)/

.PHONY: dev serve open help

# Start a local server and open the game in the browser.
dev:
	@echo "Mundum running at $(URL)  (Ctrl+C to stop)"
	@( sleep 1 && open "$(URL)" ) &
	@python3 -m http.server $(PORT)

# Serve without opening the browser.
serve:
	@echo "Mundum running at $(URL)  (Ctrl+C to stop)"
	@python3 -m http.server $(PORT)

# Open the browser against an already-running server.
open:
	@open "$(URL)"

help:
	@echo "make dev    - serve the game and open it in the browser"
	@echo "make serve  - serve only (no browser)"
	@echo "make open   - open the browser at $(URL)"
	@echo "Override the port: make dev PORT=3000"
