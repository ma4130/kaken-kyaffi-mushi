# tools/art/svg/*.svg を Edge のヘッドレスで PNG にする（背景は透過）。
#   powershell -ExecutionPolicy Bypass -File tools/art/rasterize.ps1
# そのあと python tools/art/finish-art.py で assets/ に WebP/PNG として置く。
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$svgDir = Join-Path $here 'svg'
$pngDir = Join-Path $here 'png'
New-Item -ItemType Directory -Force $pngDir | Out-Null
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile = Join-Path $env:TEMP 'mushi-art-edge'
Get-ChildItem $svgDir -Filter *.svg | ForEach-Object {
  $xml = [xml](Get-Content $_.FullName -Raw -Encoding UTF8)
  $w = $xml.svg.width; $h = $xml.svg.height
  $out = Join-Path $pngDir ($_.BaseName + '.png')
  $url = 'file:///' + ($_.FullName -replace '\\', '/')
  & $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$profile" `
    --default-background-color=00000000 --window-size="$w,$h" --screenshot="$out" $url 2>$null | Out-Null
  Write-Output "$($_.BaseName) ${w}x${h}"
}
