# Serves Crunch on this PC and on every phone on the same Wi-Fi.
# Leave the window open. Close it to stop the game.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$rootFull = [IO.Path]::GetFullPath($root)
if (-not $rootFull.EndsWith("\")) { $rootFull += "\" }

$types = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".ico"  = "image/x-icon"
  ".json" = "application/json; charset=utf-8"
  ".webp" = "image/webp"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
}

function Get-SafeFile([string]$urlPath) {
  $pathOnly = ($urlPath -split "\?")[0]
  $rel = [Uri]::UnescapeDataString($pathOnly).TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
  $rel = $rel -replace "/", "\"
  $full = [IO.Path]::GetFullPath((Join-Path $rootFull $rel))
  if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  if (Test-Path -LiteralPath $full -PathType Container) {
    $index = Join-Path $full "index.html"
    if (Test-Path -LiteralPath $index) { return $index }
    return $null
  }
  if (Test-Path -LiteralPath $full -PathType Leaf) { return $full }
  return $null
}

function Send-Response($stream, [int]$code, [string]$status, [string]$type, [byte[]]$body) {
  $head = "HTTP/1.1 $code $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
  $headBytes = [Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
}

$ports = 8080, 8081, 8090, 4173
$listener = $null
$port = 0
foreach ($candidate in $ports) {
  $tryListen = New-Object System.Net.Sockets.TcpListener ([Net.IPAddress]::Any, $candidate)
  try {
    $tryListen.Start()
    $listener = $tryListen
    $port = $candidate
    break
  } catch {
    $tryListen.Stop()
  }
}
if (-not $listener) {
  Write-Host "Could not open a port. Close other Crunch windows and try again."
  exit 1
}

$addresses = @()
try {
  $addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object {
    $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"
  })
} catch {
  $addresses = @()
}

function Score-Address($item) {
  $name = $item.InterfaceAlias
  if ($name -match "Wi-?Fi|WLAN|Wireless") { return 0 }
  if ($name -match "Ethernet" -and $name -notmatch "vEthernet|Hyper-V|WSL|Virtual|VMware") { return 1 }
  if ($name -match "vEthernet|Hyper-V|WSL|Virtual|VMware|Loopback|Bluetooth") { return 3 }
  return 2
}

$ordered = @($addresses | Sort-Object { Score-Address $_ }, IPAddress)
Write-Host ""
Write-Host "Crunch is ready."
Write-Host "On this PC:   http://localhost:$port/"
if ($ordered.Count -eq 0) {
  Write-Host "No Wi-Fi address found. Connect this PC to Wi-Fi, then start again."
} else {
  $first = $true
  foreach ($item in $ordered) {
    $label = $(if ($first) { "On a phone:  " } else { "Also try:    " })
    Write-Host "$label http://$($item.IPAddress):$port/   ($($item.InterfaceAlias))"
    $first = $false
  }
}
Write-Host ""
Write-Host "The phone must be on the same Wi-Fi as this PC."
Write-Host "If Windows asks about a firewall, allow it on Private networks."
Write-Host "Leave this window open. Close it to stop the game."
Write-Host ""

try { Start-Process "http://localhost:$port/" } catch {}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 8000
    $client.SendTimeout = 8000
    $stream = $client.GetStream()
    $buffer = New-Object byte[] 4096
    $read = 0
    $raw = New-Object Text.StringBuilder
    while ($read -lt 8192) {
      $n = $stream.Read($buffer, 0, $buffer.Length)
      if ($n -le 0) { break }
      $read += $n
      [void]$raw.Append([Text.Encoding]::ASCII.GetString($buffer, 0, $n))
      if ($raw.ToString().Contains("`r`n`r`n")) { break }
    }
    $request = $raw.ToString()
    $line = ($request -split "`r`n", 2)[0]
    $parts = $line -split " "
    $method = if ($parts.Length -gt 0) { $parts[0] } else { "" }
    $target = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
    if ($method -ne "GET" -and $method -ne "HEAD") {
      $msg = [Text.Encoding]::UTF8.GetBytes("Method not allowed")
      Send-Response $stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $msg
      continue
    }
    $file = Get-SafeFile $target
    if (-not $file) {
      $msg = [Text.Encoding]::UTF8.GetBytes("Not found")
      Send-Response $stream 404 "Not Found" "text/plain; charset=utf-8" $msg
      continue
    }
    $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
    $type = $types[$ext]
    if (-not $type) { $type = "application/octet-stream" }
    $body = [IO.File]::ReadAllBytes($file)
    if ($method -eq "HEAD") { $body = New-Object byte[] 0 }
    Send-Response $stream 200 "OK" $type $body
  } catch {
    # A phone closed the connection early. Keep serving.
  } finally {
    if ($client) { $client.Close() }
  }
}
