$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root "out"

if (-not (Test-Path (Join-Path $out "com\nihongocoach\BackendApplication.class"))) {
  & (Join-Path $root "build.ps1")
}

java -cp $out com.nihongocoach.BackendApplication
