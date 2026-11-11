param([Parameter(Mandatory)][ValidateSet('build','fetch','review')][string]$Mode)
$ErrorActionPreference = 'Stop'
$log = Join-Path $env:RUNNER_TEMP ('codeatlas-prepare-diagnostic-' + $Mode + '.log')
# New per-job private log; never upload or print its contents.
$handle = [IO.File]::Open($log, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
$handle.Dispose()
$watch = [Diagnostics.Stopwatch]::StartNew()
$failed = $false
if ($Mode -eq 'build') { Write-Output 'PACK_PROGRESS:PARENT:READER_BUILD:BEGIN:0:0' }
try {
  if ($Mode -eq 'build') {
    if ((Get-PSDrive D).Free -lt 8GB) { throw 'DISK_BUDGET' }
    & "$PSScriptRoot/public-build.ps1" -SourceRoot "$PWD/source" -OutputRoot "$PWD/pack-work" -ReaderOnly *>> $log
    if ($LASTEXITCODE -ne 0) { throw 'BUILD_STOP' }
  } else {
    $entry = if ($Mode -eq 'fetch') { 'public-pack.mjs' } else { 'public-pack-diagnose.mjs' }
    $arguments = @("$PSScriptRoot/$entry")
    if ($Mode -eq 'fetch') { $arguments += 'fetch' }
    $arguments += @('./source','./pack-work')
    . "$PSScriptRoot/public-diagnostic-filter.ps1"
    & node @arguments 2>&1 | Select-DiagnosticProgress -PrivateLog $log
    if ($LASTEXITCODE -ne 0) { throw 'DIAGNOSTIC_STOP' }
  }
} catch { $failed = $true }
finally {
  if ($Mode -eq 'build') {
    $elapsed = [long]$watch.Elapsed.TotalMilliseconds
    Write-Output "PACK_PROGRESS:PARENT:READER_BUILD:END:${elapsed}:${elapsed}"
  }
}
if ($failed) { exit 1 }
