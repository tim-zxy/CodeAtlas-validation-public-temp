$ErrorActionPreference = 'Stop'
$failed = $false
function Select-ShortDiagnostic {
  [CmdletBinding()]param([Parameter(ValueFromPipeline)]$Line)
  begin { $count=0 }
  process {
    $text=$Line.ToString()
    if ($count -lt 24 -and $text -cmatch '^SHORT_DIAG:[1-9]:[123]:[0-9]{1,9}:[0-9]{1,2}:[01]$') { Write-Output $text; $count++ }
  }
}
try {
  $oldPreference=$PSNativeCommandUseErrorActionPreference
  try {
    $PSNativeCommandUseErrorActionPreference=$false
    & node "$PSScriptRoot/public-short-diagnostic-entry.mjs" 2>&1 | Select-ShortDiagnostic
    if ($LASTEXITCODE -ne 0) { $failed=$true }
  } finally { $PSNativeCommandUseErrorActionPreference=$oldPreference }
} catch { $failed=$true }
if ($failed) { Write-Output 'SHORT_DIAG:9:3:0:0:0'; exit 1 }
