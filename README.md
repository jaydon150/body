# body

An interactive 3D atlas of the human body, intended for open academic distribution.

The viewer lets you remove systems layer by layer, isolate any system, and dive into subsystems and their subsystems. v1 covers integumentary, skeletal, and muscular systems (male anatomy) at organ-level detail. Tissue and cellular detail are planned for later phases.

## Status

**Phase 0 — Infrastructure.** Folder structure, agent system, and contracts are being laid down. No anatomy content yet.

## Stack

- **Web app** — Vite + React + TypeScript + react-three-fiber on Three.js
- **Baseline renderer** — WebGL2, with WebGPU when available
- **Asset base** — Z-Anatomy / BodyParts3D (CC-BY-SA-2.1-JP), with targeted custom meshes reserved for later phases
- **Distribution** — open academic

## License map

| Layer | License | File |
|-------|---------|------|
| Code | AGPL-3.0-or-later | [LICENSE](LICENSE) |
| Anatomical content + data | CC-BY-SA-4.0 | [LICENSE-CONTENT](LICENSE-CONTENT) |
| Project documentation | CC-BY-4.0 | [LICENSE-DOCS](LICENSE-DOCS) |
| Upstream Z-Anatomy / BodyParts3D | CC-BY-SA-2.1-JP | see [ATTRIBUTIONS.md](ATTRIBUTIONS.md) |

Derivative works of Z-Anatomy / BodyParts3D retain the upstream CC-BY-SA-2.1-JP obligations. The CC-BY-SA-4.0 license on new content runs alongside, not in place of, the upstream share-alike. See [docs/decisions/0002-asset-source.md](docs/decisions/0002-asset-source.md).

## Repository structure

```
data/         — raw + canonical + derived anatomical data
pipelines/    — raw → canonical → derived transforms
app/web/      — viewer (Vite + R3F)
app/shared/   — JSON Schemas, cross-agent contracts
docs/         — orchestrator artifacts, agent prompts, ADRs, references
tests/        — schema validation, visual regression, fixtures
tools/        — one-off utilities
```

See [docs/orchestrator/master-spec.md](docs/orchestrator/master-spec.md) for the full project spec and current state.

## Development

This project uses a structured agent system, not raw solo development. See [docs/agents/](docs/agents/) for the agent roster and per-agent scope and contracts. Architectural decisions are recorded in [docs/decisions/](docs/decisions/).

## Acknowledgements

This project would not exist without the freely-released anatomical datasets it builds on. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for the full chain.
