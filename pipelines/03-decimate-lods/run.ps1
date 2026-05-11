# pipelines/03-decimate-lods/run.ps1
# P1.06 orchestration: snapshot LOD0 metadata -> Blender LOD1+LOD2 generation
#                      -> reinject attribution -> update source.txt -> verify.
#
# Usage:
#   .\run.ps1                                       # full 79-glb pass
#   .\run.ps1 -SmokeTarget uberon_0000981           # single-glb smoke test
#   .\run.ps1 -SkipSnapshot -SkipBlender            # only reinject + source.txt + verify
#
# Prereqs:
#   - Blender 5.x at C:\Program Files\Blender Foundation\Blender 5.1\blender.exe
#   - Node 18+ (no npm packages required -- zero-dep direct GLB binary parser)
#   - P1.05 must have produced cleaned data/canonical/meshes/*/lod0.glb (it did).

[CmdletBinding()]
param(
    [string]$BlenderExe = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe",
    [string]$SmokeTarget = "",
    [switch]$SkipBlender,
    [switch]$SkipReinject,
    [switch]$SkipSnapshot,
    [switch]$SkipSourceTxt,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
Set-Location $ScriptDir

Write-Host "=== P1.06 LOD generation orchestration ===" -ForegroundColor Cyan
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

# --- 1. Snapshot LOD0 metadata (so we can restore attribution after Blender). ---
if (-not $SkipSnapshot) {
    Write-Host ""
    Write-Host "--- Step 1: snapshot LOD0 metadata ---" -ForegroundColor Cyan
    node reinject_attribution.mjs --snapshot
    if ($LASTEXITCODE -ne 0) { throw "LOD0 metadata snapshot failed" }
} else {
    Write-Host "Skipping LOD0 snapshot (--SkipSnapshot)."
}

# --- 2. Blender headless LOD1+LOD2 generation pass. ---
if (-not $SkipBlender) {
    Write-Host ""
    Write-Host "--- Step 2: Blender LOD1+LOD2 generation ($BlenderExe) ---" -ForegroundColor Cyan
    if ($SmokeTarget) {
        $env:DECIMATE_SMOKE_TARGET = $SmokeTarget
    } else {
        $env:DECIMATE_SMOKE_TARGET = ""
    }
    & $BlenderExe --background --python (Join-Path $ScriptDir "decimate_lods.py")
    if ($LASTEXITCODE -ne 0) { throw "Blender LOD generation exited non-zero ($LASTEXITCODE)" }
} else {
    Write-Host "Skipping Blender pass (--SkipBlender)."
}

# --- 3. Re-inject attribution into every LOD1+LOD2. ---
if (-not $SkipReinject) {
    Write-Host ""
    Write-Host "--- Step 3: re-inject attribution into LOD1/LOD2 ---" -ForegroundColor Cyan
    node reinject_attribution.mjs --reinject
    if ($LASTEXITCODE -ne 0) { throw "attribution reinject failed" }
} else {
    Write-Host "Skipping reinject (--SkipReinject)."
}

# --- 4. Update source.txt with LOD record. ---
if (-not $SkipSourceTxt) {
    Write-Host ""
    Write-Host "--- Step 4: update source.txt files with LODs block ---" -ForegroundColor Cyan
    node update_source_txt.mjs
    if ($LASTEXITCODE -ne 0) { throw "source.txt update failed" }
} else {
    Write-Host "Skipping source.txt update (--SkipSourceTxt)."
}

# --- 5. Verify three sample LOD chains. ---
if (-not $SkipVerify) {
    Write-Host ""
    Write-Host "--- Step 5: verify 3 sample LOD chains ---" -ForegroundColor Cyan
    node verify.mjs
    if ($LASTEXITCODE -ne 0) { throw "verification failed" }
} else {
    Write-Host "Skipping verify (--SkipVerify)."
}

Write-Host ""
Write-Host "=== P1.06 done ===" -ForegroundColor Green
