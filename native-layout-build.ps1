param([Parameter(Mandatory)][string]$SourceRoot, [Parameter(Mandatory)][string]$OutputRoot)
$ErrorActionPreference = 'Stop'
function Run([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'BUILD_COMMAND_FAILED' }
}
function Sha([string]$File) { (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() }
$SourceRoot = [IO.Path]::GetFullPath($SourceRoot)
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
if (Test-Path -LiteralPath $OutputRoot) { throw 'OUTPUT_ALREADY_EXISTS' }
if ($OutputRoot -eq $SourceRoot -or $OutputRoot.StartsWith($SourceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or $SourceRoot.StartsWith($OutputRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'OUTPUT_SOURCE_OVERLAP' }
if ((git -C $SourceRoot rev-parse HEAD) -ne '79da40105d480cce540ac636334dd9b6d3f54956') { throw 'SOURCE_IDENTITY_MISMATCH' }
$expected = [ordered]@{
  'Cargo.lock' = '72b958d8d35046d3c26c09a4ee1bc7f9249370ecaebf09772d4507fe3cc5d849'
  'Cargo.toml' = 'd55a4aa34260d8f79a14e8624d3b0b1b320e99c3812503c8b53fe92de2eb00f9'
  'rust-toolchain.toml' = 'b5c4a6db877d7ecfa826fbce94d61bdb85b8f173e7a943e6bc3e9441825729ee'
  'pnpm-lock.yaml' = '236ce051e47f080430d5feffe54bf7b0eaf970467acf453c5307d2055b78f13a'
  'pnpm-workspace.yaml' = '52b3a87784a67dfaa6c254807c2f037e4cafb962ceb753ec7af028fccdb8cf27'
  'package.json' = '0472996803bf0e04b83a4753fc04ed0af78bcbb25be86288af3bc6b65d10a92e'
}
function VerifyLocks {
  foreach ($entry in $expected.GetEnumerator()) {
    if ((Sha (Join-Path $SourceRoot $entry.Key)) -ne $entry.Value) { throw 'LOCK_IDENTITY_MISMATCH' }
  }
}
VerifyLocks
if ((node --version) -ne 'v24.15.0' -or (pnpm --version) -ne '11.19.0') { throw 'JS_TOOL_VERSION_MISMATCH' }
if ($env:NODE_OPTIONS -or $env:NODE_PATH -or $env:RUSTC_WRAPPER -or $env:RUSTC_WORKSPACE_WRAPPER -or $env:RUSTFLAGS -or $env:CARGO_ENCODED_RUSTFLAGS) { throw 'UNEXPECTED_BUILD_OVERRIDE' }
New-Item -ItemType Directory -Path $OutputRoot | Out-Null
$env:CARGO_HOME = Join-Path $OutputRoot 'cargo-home'
$env:CARGO_BUILD_JOBS = '1'
$env:CARGO_INCREMENTAL = '0'
Run 'rustup' @('toolchain','install','1.98.1','--profile','minimal','--no-self-update')
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$vsRoot = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if ($LASTEXITCODE -ne 0 -or -not $vsRoot -or @($vsRoot).Count -ne 1) { throw 'MSVC_SELECTION_FAILED' }
$vsCommand = '"' + (Join-Path $vsRoot 'Common7\Tools\VsDevCmd.bat') + '" -no_logo -arch=x64 -host_arch=x64 >nul && set'
$vsEnvironment = & $env:ComSpec /d /s /c $vsCommand
if ($LASTEXITCODE -ne 0) { throw 'MSVC_ENVIRONMENT_FAILED' }
foreach ($line in $vsEnvironment) {
  if ($line -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
$cargo = (& rustup which --toolchain 1.98.1 cargo).Trim()
$rustc = (& rustup which --toolchain 1.98.1 rustc).Trim()
if ((node --version) -ne 'v24.15.0') { throw 'POST_MSVC_NODE_VERSION_MISMATCH' }
if ((& $rustc --version) -notmatch '^rustc 1\.98\.1 ') { throw 'RUST_VERSION_MISMATCH' }
$env:RUSTUP_TOOLCHAIN = '1.98.1'
$env:CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER = (Get-Command link.exe).Source
$env:CC_x86_64_pc_windows_msvc = (Get-Command cl.exe).Source
$env:CXX_x86_64_pc_windows_msvc = $env:CC_x86_64_pc_windows_msvc
$toolFiles = [ordered]@{ node=(Get-Command node.exe).Source; powershell=(Get-Command pwsh.exe).Source; tar=(Join-Path $env:SystemRoot 'System32/tar.exe'); cargo=$cargo; rustc=$rustc; cl=$env:CC_x86_64_pc_windows_msvc; linker=$env:CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER; rc=(Get-Command rc.exe).Source }
$tools = @($toolFiles.GetEnumerator() | ForEach-Object { [ordered]@{role=$_.Key;sha256=Sha $_.Value} })
$sdkVersion = $env:WindowsSDKVersion.TrimEnd([IO.Path]::DirectorySeparatorChar)
$receipt = [ordered]@{ sourceCommit='79da40105d480cce540ac636334dd9b6d3f54956';nodeVersion='24.15.0';rustVersion='1.98.1';imageVersion=$env:ImageVersion;vcToolsVersion=$env:VCToolsVersion;sdkVersion=$sdkVersion;tools=$tools;locks=$expected;cargoIncremental=$false;cargoJobs=1;networkIsolation='NOT_CLAIMED';completeOsProvenance='NOT_ESTABLISHED' }
[IO.File]::WriteAllText((Join-Path $OutputRoot 'build-receipt.json'), ($receipt | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
Push-Location $SourceRoot
try {
  Run 'pnpm' @('install','--frozen-lockfile','--ignore-scripts','--store-dir',(Join-Path $OutputRoot 'pnpm-store'))
  Run 'pnpm' @('build')
  Run 'node' @((Join-Path $PSScriptRoot 'native-layout-bridge.mjs'),'before',$SourceRoot,$OutputRoot)
  Run $cargo @('fetch','--locked')
  $env:CARGO_NET_OFFLINE = 'true'
  $env:CARGO_TARGET_DIR = Join-Path $SourceRoot 'target'
  $actualBuildArgs = @('build','--workspace')
  & $cargo @actualBuildArgs
  $actualBuildStatus = $LASTEXITCODE
  $processRecord = @{command='cargo';args=$actualBuildArgs;status=$actualBuildStatus;toolchain=(& $rustc --version).Trim()}
  [IO.File]::WriteAllText((Join-Path $OutputRoot 'native-process-result.json'),($processRecord | ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
  if ($actualBuildStatus -ne 0) { throw 'NATIVE_BUILD_FAILED' }
  VerifyLocks
  if (git status --porcelain --untracked-files=no) { throw 'TRACKED_SOURCE_CHANGED' }
  Run 'node' @((Join-Path $PSScriptRoot 'native-layout-bridge.mjs'),'after',$SourceRoot,$OutputRoot)
} finally { Pop-Location }