param([Parameter(Mandatory)][ValidateSet('build','fetch','freeze','seed')][string]$Mode)
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
  } elseif ($Mode -eq 'seed') {
    $oldNativePreference = $PSNativeCommandUseErrorActionPreference
    try {
      $PSNativeCommandUseErrorActionPreference = $false
      & node "$PSScriptRoot/public-reader-seed.mjs" seed ./source ./pack-work 2>&1 | Select-DiagnosticProgress -PrivateLog $log
    } finally { $PSNativeCommandUseErrorActionPreference = $oldNativePreference }
  } else {
    & node "$PSScriptRoot/public-reader-freeze.mjs" $Mode ./source ./pack-work 2>&1 | Select-DiagnosticProgress -PrivateLog $log
  }
  $commandFailed = ($LASTEXITCODE -ne 0)
  if ($Mode -eq 'seed' -and (Test-Path -LiteralPath "$PWD/reader-freeze/result.json")) {
    $r = Get-Content -Raw -LiteralPath "$PWD/reader-freeze/result.json" | ConvertFrom-Json
    foreach ($key in @('state','sourceCommit','controlCommit')) { if ($r.$key -isnot [string]) { throw 'SEED_RESULT_CONTEXT_TYPE' } }
    $matched = ($r.state -ceq 'READER_SEED_STATIC_PIN_MATCH_NOT_QUALIFIED')
    $mismatch = ($r.state -ceq 'READER_SEED_STATIC_PIN_MISMATCH_NOT_QUALIFIED')
    if (-not ($matched -or $mismatch) -or $matched -eq $commandFailed) { throw 'SEED_RESULT_STATUS' }
    if ($r.sourceCommit -cne '79da40105d480cce540ac636334dd9b6d3f54956' -or $r.controlCommit -cne $env:GITHUB_SHA) { throw 'SEED_RESULT_CONTEXT' }
    if ($r.logicalLayoutAbsent -isnot [bool] -or -not $r.logicalLayoutAbsent) { throw 'SEED_LAYOUT_NOT_ABSENT' }
    if ($r.expectedReaderSha256 -cne 'e15e1bcd6ce9aa1897554b0fbcd3de67ab40ef11f886c71c44a5a8ac1543f8c4' -or $r.profileObjectSha256 -cne '9b2716123d15227808c35fe9dd24eb5393131192aca9aaa0f1d83a90db3077f4') { throw 'SEED_RESULT_PIN' }
    $out = [ordered]@{state=$r.state;sourceCommit=$r.sourceCommit;controlCommit=$r.controlCommit}
    foreach ($key in @('readerContentSha256','expectedReaderSha256','profileObjectSha256','topologyDigest')) {
      if ($r.$key -isnot [string] -or $r.$key -cnotmatch '^[a-f0-9]{64}$') { throw 'SEED_RESULT_DIGEST' }
      $out[$key]=$r.$key
    }
    if (($r.readerContentSha256 -ceq $r.expectedReaderSha256) -ne $matched) { throw 'SEED_RESULT_PIN_STATUS' }
    foreach ($key in @('files','links','directories','dependencyEntries','cases')) {
      if ($r.$key -isnot [long] -and $r.$key -isnot [int]) { throw 'SEED_RESULT_COUNTER' }
      if ($r.$key -lt 0 -or $r.$key -gt 1000000) { throw 'SEED_RESULT_COUNTER' }
      $out[$key]=$r.$key
    }
    if ($out.cases -ne 0) { throw 'SEED_RESULT_CASES' }
    $out['logicalLayoutAbsent']=$true
    $out['actual22']='NOT_ATTEMPTED';$out['pack']='NOT_ATTEMPTED';$out['upload']='NOT_ATTEMPTED'
    $out['retention']='RUNNER_LOCAL_ONLY_NOT_A_REUSABLE_RETAINED_BUNDLE'
    Write-Output ($out | ConvertTo-Json -Compress)
  }
  if ($commandFailed) { throw 'READER_STEP_FAILED' }
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
