function Select-DiagnosticProgress {
  [CmdletBinding()]
  param([Parameter(ValueFromPipeline)]$Line, [string]$PrivateLog, [switch]$ActualHeartbeat, [switch]$ActualTelemetry)
  begin {
    $allowed = Get-Content -Raw -LiteralPath "$PSScriptRoot/public-pack-progress-stages.json" | ConvertFrom-Json
    $count = 0
    $privateCount = 0
    $heartbeatCount = 0
    $telemetryCount = 0
  }
  process {
    $text = $Line.ToString()
    $valid = $false
    if ($count -lt 256 -and $text.Length -le 256 -and $text -cmatch '^PACK_PROGRESS:(PARENT|READER):[A-Z0-9_]{2,64}:(BEGIN|END):[0-9]{1,10}:[0-9]{1,10}$') {
      $fields = $text.Split(':')
      $valid = $allowed.($fields[1]) -ccontains $fields[2]
    }
    if (-not $valid -and $ActualHeartbeat -and $count -lt 256 -and $heartbeatCount -lt 160 -and $text -cmatch '^ACTUAL22_HEARTBEAT:([0-9]{1,7})$' -and [long]$Matches[1] -le 7200000) {
      $valid = $true
      $heartbeatCount++
    }
    if (-not $valid -and $ActualTelemetry -and $count -lt 256 -and $text.Length -le 256 -and $text -cmatch '^ACTUAL22_DIAG:(?:[0-9]{1,9}:){16}[0-9]{1,9}$') {
      $eventId = [int]$text.Split(':')[1]
      if ($eventId -eq 7 -and $heartbeatCount -lt 160) { $valid = $true; $heartbeatCount++ }
      elseif ($eventId -ge 1 -and $eventId -le 9 -and $eventId -ne 7 -and $telemetryCount -lt 128) { $valid = $true; $telemetryCount++ }
    }
    if ($valid) { Write-Output $text; $count++ }
    elseif ($PrivateLog -and $privateCount -lt 256) {
      Add-Content -LiteralPath $PrivateLog -Value $text.Substring(0, [Math]::Min($text.Length, 4096))
      $privateCount++
    }
  }
}

