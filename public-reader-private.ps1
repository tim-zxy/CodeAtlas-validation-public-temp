param([Parameter(Mandatory)][ValidateSet('build','fetch','freeze')][string]$Mode)
$ErrorActionPreference = 'Stop'
$failed = $false
$watch = [Diagnostics.Stopwatch]::StartNew()
try {
  $log = Join-Path $env:RUNNER_TEMP ('codeatlas-reader-only-' + $Mode + '.log')
  $handle = [IO.File]::Open($log, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
  $handle.Dispose()
  . "$PSScriptRoot/public-diagnostic-filter.ps1"
  if ($Mode -eq 'build') {
    if ((Get-PSDrive D).Free -lt 8GB) { throw 'DISK_BUDGET' }
    & pwsh -NoProfile -NonInteractive -File "$PSScriptRoot/public-build.ps1" -SourceRoot "$PWD/source" -OutputRoot "$PWD/pack-work" -ReaderOnly 2>&1 | Select-DiagnosticProgress -PrivateLog $log
  } else {
    & node "$PSScriptRoot/public-reader-freeze.mjs" $Mode ./source ./pack-work 2>&1 | Select-DiagnosticProgress -PrivateLog $log
  }
  if ($LASTEXITCODE -ne 0) { throw 'READER_STEP_FAILED' }
  if ($Mode -eq 'freeze') {
    $r = Get-Content -Raw -LiteralPath "$PWD/reader-freeze/result.json" | ConvertFrom-Json
    if ($r.state -cne 'READER_CLOSURE_VERIFIED_NOT_QUALIFIED' -or $r.sourceCommit -cne '79da40105d480cce540ac636334dd9b6d3f54956' -or $r.controlCommit -cne $env:GITHUB_SHA) { throw 'READER_RESULT_CONTEXT' }
    $out = [ordered]@{state=$r.state;sourceCommit=$r.sourceCommit;controlCommit=$r.controlCommit}
    foreach ($key in @('readerContentSha256','profileObjectSha256','topologyDigest')) {
      if ($r.$key -cnotmatch '^[a-f0-9]{64}$') { throw 'READER_RESULT_DIGEST' }
      $out[$key] = $r.$key
    }
    foreach ($key in @('files','links','directories','dependencyEntries','cases')) {
      if ($r.$key -isnot [long] -and $r.$key -isnot [int]) { throw 'READER_RESULT_COUNTER' }
      if ($r.$key -lt 0 -or $r.$key -gt 1000000) { throw 'READER_RESULT_COUNTER' }
      $out[$key] = $r.$key
    }
    if ($out.cases -ne 22) { throw 'READER_RESULT_CASES' }
    $out['actual22']='NOT_ATTEMPTED';$out['pack']='NOT_ATTEMPTED';$out['upload']='NOT_ATTEMPTED'
    $out['retention']='RUNNER_LOCAL_ONLY_NOT_A_REUSABLE_RETAINED_BUNDLE'
    $out['historicalWholeTreeEquality']='NOT_CLAIMED'
    Write-Output ($out | ConvertTo-Json -Compress)
  }
} catch { $failed = $true }
$elapsed = [long]$watch.Elapsed.TotalMilliseconds
if ($failed) { Write-Output "READER_ONLY_STEP_FAILED:$Mode"; exit 1 }
Write-Output "READER_ONLY_STEP_COMPLETE:${Mode}:$elapsed"
