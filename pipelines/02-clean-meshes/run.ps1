# pipelines/02-clean-meshes/run.ps1
# P1.05 orchestration: snapshot metadata -> Blender cleanup -> reinject attribution -> verify.
#
# Usage:
#   .\run.ps1                    # full 79-glb pass
#   .\run.ps1 -SmokeTarget uberon_0000981  # single-glb smoke test
#
# Prereqs:
#   - Blender 5.x at C:\Program Files\Blender Foundation\Blender 5.1\blender.exe
#   - Node 18+ with the local deps installed (`npm install` in this folder)
#   - P1.04 must have produced data/canonical/meshes/*/lod0.glb already

[CmdletBinding()]
param(
    [string]$BlenderExe = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe",
    [string]$SmokeTarget = "",
    [switch]$SkipBlender,
    [switch]$SkipReinject,
    [switch]$SkipSnapshot
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
Set-Location $ScriptDir

Write-Host "=== P1.05 mesh cleanup orchestration ===" -ForegroundColor Cyan
Write-Host "Pipeline dir : $ScriptDir"
Write-Host "Blender exe  : $BlenderExe"
if ($SmokeTarget) { Write-Host "Smoke target : $SmokeTarget" -ForegroundColor Yellow }
Write-Host ""

# --- 0. Pre-flight ---
if (-not (Test-Path -LiteralPath $BlenderExe)) {
    throw "Blender executable not found at: $BlenderExe"
}
$blenderVersionLine = (& $BlenderExe --version) | Select-Object -First 1
Write-Host "Blender version: $blenderVersionLine"

if (-not (Test-Path -LiteralPath (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "Installing Node deps (npm install)..." -ForegroundColor Yellow
    npm install --silent
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

# --- 1. Snapshot pre-clean metadata (so we can restore attribution after Blender). ---
if (-not $SkipSnapshot) {
    Write-Host ""
    Write-Host "--- Step 1: snapshot pre-clean metadata ---" -ForegroundColor Cyan
    node reinject_attribution.mjs --snapshot
    if ($LASTEXITCODE -ne 0) { throw "metadata snapshot failed" }
} else {
    Write-Host "Skipping pre-clean snapshot (--SkipSnapshot)."
}

# --- 2. Blender headless cleanup pass. ---
if (-not $SkipBlender) {
    Write-Host ""
    Write-Host "--- Step 2: Blender cleanup ($BlenderExe) ---" -ForegroundColor Cyan
    if ($SmokeTarget) {
        $env:CLEAN_SMOKE_TARGET = $SmokeTarget
    } else {
        $env:CLEAN_SMOKE_TARGET = ""
    }
    & $BlenderExe --background --python (Join-Path $ScriptDir "clean_glbs.py")
    if ($LASTEXITCODE -ne 0) { throw "Blender cleanup pass exited non-zero ($LASTEXITCODE)" }
} else {
    Write-Host "Skipping Blender pass (--SkipBlender)."
}

# --- 3. Re-inject attribution. ---
if (-not $SkipReinject) {
    Write-Host ""
    Write-Host "--- Step 3: re-inject attribution ---" -ForegroundColor Cyan
    node reinject_attribution.mjs --reinject
    if ($LASTEXITCODE -ne 0) { throw "attribution reinject failed" }
} else {
    Write-Host "Skipping reinject (--SkipReinject)."
}

# --- 4. Update source.txt with cleanup record. ---
Write-Host ""
Write-Host "--- Step 4: update source.txt files ---" -ForegroundColor Cyan
node update_source_txt.mjs
if ($LASTEXITCODE -ne 0) { throw "source.txt update failed" }

# --- 5. Verify. ---
Write-Host ""
Write-Host "--- Step 5: verify 3 sample glbs ---" -ForegroundColor Cyan
node verify.mjs
if ($LASTEXITCODE -ne 0) { throw "verification failed" }

Write-Host ""
Write-Host "=== P1.05 done ===" -ForegroundColor Green
