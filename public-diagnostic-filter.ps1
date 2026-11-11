function Select-DiagnosticProgress {
  [CmdletBinding()]
  param([Parameter(ValueFromPipeline)]$Line, [string]$PrivateLog)
  begin {
    $allowed = Get-Content -Raw -LiteralPath "$PSScriptRoot/public-pack-progress-stages.json" | ConvertFrom-Json
    $count = 0
    $privateCount = 0
  }
  process {
    $text = $Line.ToString()
    $valid = $false
    if ($count -lt 256 -and $text.Length -le 256 -and $text -cmatch '^PACK_PROGRESS:(PARENT|READER):[A-Z0-9_]{2,64}:(BEGIN|END):[0-9]{1,10}:[0-9]{1,10}$') {
      $fields = $text.Split(':')
      $valid = $allowed.($fields[1]) -ccontains $fields[2]
    }
    if ($valid) { Write-Output $text; $count++ }
    elseif ($PrivateLog -and $privateCount -lt 256) {
      Add-Content -LiteralPath $PrivateLog -Value $text.Substring(0, [Math]::Min($text.Length, 4096))
      $privateCount++
    }
  }
}
