param([int]$port = 8080)

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|Ethernet' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -ExpandProperty IPAddress -First 1)
if (-not $ip) { $ip = "127.0.0.1" }

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
}

$listener = $null
while ($port -lt 8100) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
        $listener.Start()
        break
    } catch {
        $port++
    }
}

if (-not $listener -or -not $listener.Server.IsBound) {
    Write-Host "Could not bind to any port." -ForegroundColor Red
    exit 1
}

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

# Store runtime sync state in Windows TEMP directory to prevent VS Code Live Server from triggering full-page browser reloads
$tempDir = [System.IO.Path]::GetTempPath()
$syncFile = [System.IO.Path]::Combine($tempDir, "deqx_live_sync_state.json")
$global:syncVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$global:syncTime = [DateTime]::UtcNow.ToString("o")
$global:syncDataBytes = $null

if ([System.IO.File]::Exists($syncFile)) {
    try {
        $global:syncDataBytes = [System.IO.File]::ReadAllBytes($syncFile)
        $global:syncVersion = [System.IO.File]::GetLastWriteTimeUtc($syncFile).ToFileTimeUtc()
        $global:syncTime = [System.IO.File]::GetLastWriteTimeUtc($syncFile).ToString("o")
    } catch {}
}

Clear-Host
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "       DEQX FIT - Mobile Live Stream & Auto-Sync Server" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " On your PC:     http://localhost:$port" -ForegroundColor White
Write-Host " On your Phone:  http://${ip}:$port" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------"
Write-Host " Live Sync:      Instant Real-Time Data Sync Active" -ForegroundColor Green
Write-Host " Changes made on your laptop will automatically reload"
Write-Host " on your phone screen in real time!" -ForegroundColor Green
Write-Host "=========================================================="
Write-Host "Server is running! Press Ctrl + C to stop." -ForegroundColor DarkGray
Write-Host ""

try {
    while ($listener.Server.IsBound) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reqBytes = [System.Collections.Generic.List[byte]]::new()
            $buf = New-Object byte[] 8192
            $bytesRead = $stream.Read($buf, 0, 8192)
            if ($bytesRead -gt 0) {
                for ($i = 0; $i -lt $bytesRead; $i++) { $reqBytes.Add($buf[$i]) }
            }

            # Locate HTTP headers boundary (\r\n\r\n)
            $headerEnd = -1
            for ($i = 0; $i -le $reqBytes.Count - 4; $i++) {
                if ($reqBytes[$i] -eq 13 -and $reqBytes[$i+1] -eq 10 -and $reqBytes[$i+2] -eq 13 -and $reqBytes[$i+3] -eq 10) {
                    $headerEnd = $i
                    break
                }
            }

            if ($headerEnd -gt 0) {
                $headerStr = [System.Text.Encoding]::UTF8.GetString($reqBytes.ToArray(), 0, $headerEnd)
                $firstLine = $headerStr.Split("`n")[0].Trim()
                $parts = $firstLine.Split(" ")
                $method = $parts[0].ToUpper()
                $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
                if ($rawPath.Contains("?")) { $rawPath = $rawPath.Substring(0, $rawPath.IndexOf("?")) }

                # Determine Content-Length for request body reading
                $contentLength = 0
                if ($headerStr -match 'Content-Length:\s*(\d+)') {
                    $contentLength = [int]$matches[1]
                }

                $bodyStart = $headerEnd + 4
                while (($reqBytes.Count - $bodyStart) -lt $contentLength) {
                    $needed = $contentLength - ($reqBytes.Count - $bodyStart)
                    $toRead = [Math]::Min(8192, $needed)
                    $n = $stream.Read($buf, 0, $toRead)
                    if ($n -le 0) { break }
                    for ($i = 0; $i -lt $n; $i++) { $reqBytes.Add($buf[$i]) }
                }

                # 1. CORS Preflight
                if ($method -eq "OPTIONS") {
                    $header = "HTTP/1.1 200 OK`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, X-Client-Id`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                    $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($hBytes, 0, $hBytes.Length)
                    $stream.Flush()
                }
                # 2. Check Data Version (/api/sync/version)
                elseif ($rawPath -eq "/api/sync/version") {
                    $respJson = "{`"version`":$($global:syncVersion),`"updated`":`"$($global:syncTime)`"}"
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, X-Client-Id`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
                    $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($hBytes, 0, $hBytes.Length)
                    $stream.Write($respBytes, 0, $respBytes.Length)
                    $stream.Flush()
                }
                # 3a. Reset Sync State (/api/sync/reset or DELETE /api/sync)
                elseif ($rawPath -eq "/api/sync/reset" -or ($rawPath -eq "/api/sync" -and $method -eq "DELETE")) {
                    $global:syncDataBytes = $null
                    try {
                        if ([System.IO.File]::Exists($syncFile)) {
                            [System.IO.File]::Delete($syncFile)
                        }
                    } catch {}
                    $global:syncVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                    $global:syncTime = [DateTime]::UtcNow.ToString("o")
                    $respJson = "{`"status`":`"reset`",`"version`":$($global:syncVersion),`"updated`":`"$($global:syncTime)`"}"
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, X-Client-Id`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
                    $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($hBytes, 0, $hBytes.Length)
                    $stream.Write($respBytes, 0, $respBytes.Length)
                    $stream.Flush()
                }
                # 3b. Pull Current Data (/api/sync GET)
                elseif ($rawPath -eq "/api/sync" -and $method -eq "GET") {
                    if ($global:syncDataBytes) {
                        $respBytes = $global:syncDataBytes
                    } elseif ([System.IO.File]::Exists($syncFile)) {
                        $global:syncDataBytes = [System.IO.File]::ReadAllBytes($syncFile)
                        $respBytes = $global:syncDataBytes
                    } else {
                        $respBytes = [System.Text.Encoding]::UTF8.GetBytes("{`"version`":0,`"d`":null,`"v9`":null}")
                    }
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, X-Client-Id`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
                    $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($hBytes, 0, $hBytes.Length)
                    $stream.Write($respBytes, 0, $respBytes.Length)
                    $stream.Flush()
                }
                # 4. Push Updated Data (/api/sync POST)
                elseif ($rawPath -eq "/api/sync" -and $method -eq "POST") {
                    $bodyBytes = New-Object byte[] ($reqBytes.Count - $bodyStart)
                    [System.Array]::Copy($reqBytes.ToArray(), $bodyStart, $bodyBytes, 0, $bodyBytes.Length)
                    
                    # Store in memory and outside workspace directory
                    $global:syncDataBytes = $bodyBytes
                    try {
                        [System.IO.File]::WriteAllBytes($syncFile, $bodyBytes)
                    } catch {}

                    $global:syncVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                    $global:syncTime = [DateTime]::UtcNow.ToString("o")

                    $respJson = "{`"status`":`"ok`",`"version`":$($global:syncVersion),`"updated`":`"$($global:syncTime)`"}"
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, X-Client-Id`r`nConnection: close`r`n`r`n"
                    $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($hBytes, 0, $hBytes.Length)
                    $stream.Write($respBytes, 0, $respBytes.Length)
                    $stream.Flush()
                }
                # 5. Static File Server
                else {
                    $filePath = if ($rawPath -eq "/" -or $rawPath -eq "") { "/index.html" } else { $rawPath }
                    $localPath = [System.IO.Path]::Combine($baseDir, $filePath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                    
                    if ([System.IO.File]::Exists($localPath)) {
                        $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                        $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
                        $fileBytes = [System.IO.File]::ReadAllBytes($localPath)
                        
                        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
                        $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                        $stream.Write($hBytes, 0, $hBytes.Length)
                        $stream.Write($fileBytes, 0, $fileBytes.Length)
                        $stream.Flush()
                    } else {
                        $header = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                        $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                        $stream.Write($hBytes, 0, $hBytes.Length)
                        $stream.Flush()
                    }
                }
            }
        } catch {
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
