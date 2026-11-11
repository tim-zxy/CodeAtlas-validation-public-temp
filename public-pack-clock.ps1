$ErrorActionPreference = 'Stop'
$file = Join-Path $env:RUNNER_TEMP 'codeatlas-public-pack-clock.json'
$record = [ordered]@{
  runId = $env:GITHUB_RUN_ID
  attempt = $env:GITHUB_RUN_ATTEMPT
  controlCommit = $env:GITHUB_SHA
  startedUtcMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}
$bytes = [Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Compress))
$stream = [IO.File]::Open($file, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
try { $stream.Write($bytes,0,$bytes.Length); $stream.Flush() }
finally { $stream.Dispose() }
