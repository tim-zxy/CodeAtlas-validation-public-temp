param()
$ErrorActionPreference = 'Stop'
$failed = $false
$phase = 'PINS'
$watch = [Diagnostics.Stopwatch]::StartNew()
try {
  foreach ($key in @('EXPECTED_COORDINATOR_SHA256','EXPECTED_APPROVAL_SHA256')) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if ($value -cnotmatch '^[a-f0-9]{64}$') { throw 'MISSING_FIXED_PIN' }
  }
  if ($env:GH_TOKEN -or $env:GITHUB_TOKEN) { throw 'TOKEN_NOT_ALLOWED_IN_READER' }
  $phase = 'PRIVATE_LOG'
  $log = Join-Path $env:RUNNER_TEMP 'codeatlas-owned-actual22.log'
  $handle = [IO.File]::Open($log,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
  $handle.Dispose()
  . "$PSScriptRoot/public-diagnostic-filter.ps1"
  $oldNativePreference = $PSNativeCommandUseErrorActionPreference
  try {
    $PSNativeCommandUseErrorActionPreference = $false
    $phase = 'REQUEST'
    & node "$PSScriptRoot/public-owned-actual-request.mjs" "$PWD" $env:EXPECTED_APPROVAL_SHA256 $env:EXPECTED_COORDINATOR_SHA256 2>&1 | Select-DiagnosticProgress -PrivateLog $log
    if ($LASTEXITCODE -ne 0) { throw 'REQUEST_FAILED' }
    $request = Join-Path "$PWD" 'actual-request.json'
    $requestSha = (Get-FileHash -LiteralPath $request -Algorithm SHA256).Hash.ToLowerInvariant()
    $phase = 'EXECUTE'
    & node "$PSScriptRoot/public-owned-actual-entry.mjs" collect "$PWD/source" "$PWD/pack-work" $request $requestSha $env:EXPECTED_COORDINATOR_SHA256 2>&1 | Select-DiagnosticProgress -PrivateLog $log -ActualHeartbeat -ActualTelemetry
    if ($LASTEXITCODE -ne 0) { throw 'EXECUTION_FAILED' }
  } finally { $PSNativeCommandUseErrorActionPreference = $oldNativePreference }
  $phase = 'RESULT'
  $r = Get-Content -Raw -LiteralPath "$PWD/actual-output/coordinator-result.json" | ConvertFrom-Json
  if ($r.state -isnot [string] -or $r.state -cne 'ACTUAL22_VERIFIED_NOT_PHASE_ACCEPTED') { throw 'RESULT_STATE' }
  if (($r.actualObservations -isnot [long] -and $r.actualObservations -isnot [int]) -or $r.actualObservations -ne 22) { throw 'RESULT_COUNT' }
  if ($r.retry -isnot [bool] -or $r.retry -or $r.hardIsolation -isnot [bool] -or $r.hardIsolation) { throw 'RESULT_SCOPE' }
  if ($r.candidateSha256 -cne 'd88650f7126cf531fcd6eaf820c8e87a103c950d2f9fcd7a79ca914c2001f5df' -or $r.archiveSha256 -cne 'b2e534f18d365f6fcd93f316e26833d4e56dfe172c82e5396d72e9fc5582e22c') { throw 'RESULT_BINDING' }
  if ($r.coordinatorSha256 -cne $env:EXPECTED_COORDINATOR_SHA256 -or $r.approvalSha256 -cne $env:EXPECTED_APPROVAL_SHA256 -or $r.requestSha256 -cne $requestSha) { throw 'RESULT_SEAL' }
  $out = [ordered]@{state=$r.state;controlCommit=$env:GITHUB_SHA;actualObservations=22;retry=$false;hardIsolation=$false}
  foreach ($key in @('candidateSha256','archiveSha256','coordinatorSha256','approvalSha256','requestSha256','readerContentSha256')) {
    if ($r.$key -isnot [string] -or $r.$key -cnotmatch '^[a-f0-9]{64}$') { throw 'RESULT_DIGEST' }
    $out[$key]=$r.$key
  }
  $out['cleanupEvidence']='ORIGINAL_VALIDATOR_PASSED_NO_OS_TREE_PROOF'
  Write-Output ($out | ConvertTo-Json -Compress)
} catch {
  $failed = $true
  Write-Output "ACTUAL22_STEP_STOPPED_NOT_QUALIFIED:$phase"
  $diagnostic = "$PWD/actual-request-diagnostic.json"
  if (Test-Path -LiteralPath $diagnostic) {
    try {
      $d = Get-Content -Raw -LiteralPath $diagnostic | ConvertFrom-Json
      if ($d.stage -is [string] -and @('CONTEXT','APPROVAL','COORDINATOR','POWERSHELL','WRITE') -ccontains $d.stage -and $d.code -is [string] -and @('ERR_ASSERTION','ENOENT','EEXIST','EPERM','EACCES','ETIMEDOUT','REQUEST_GUARD_FAILED') -ccontains $d.code) {
        Write-Output ('ACTUAL22_REQUEST_DIAGNOSTIC:' + $d.stage + ':' + $d.code)
      }
    } catch {}
  }
  $stop = "$PWD/actual-output/r9-stop-receipt.json"
  if (Test-Path -LiteralPath $stop) {
    try {
      $r = Get-Content -Raw -LiteralPath $stop | ConvertFrom-Json
      if ($r.boundary -is [string] -and $r.boundary.Length -le 128 -and $r.boundary -cmatch '^[A-Za-z0-9:._-]+$') {
        Write-Output ('ACTUAL22_STOP_BOUNDARY:' + $r.boundary)
      }
    } catch {}
  }
}
$elapsed = [long]$watch.Elapsed.TotalMilliseconds
if ($failed) { exit 1 }
Write-Output "ACTUAL22_STEP_COMPLETE:$elapsed"
