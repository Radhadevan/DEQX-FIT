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

Clear-Host
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "       DEQX FIT - Mobile Live Stream Server" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " On your PC:     http://localhost:$port" -ForegroundColor White
Write-Host " On your Phone:  http://${ip}:$port" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------"
Write-Host " Steps to open on your phone:"
Write-Host " 1. Make sure your phone is connected to the same Wi-Fi."
Write-Host " 2. Open Chrome or Safari on your phone and go to:"
Write-Host "    http://${ip}:$port" -ForegroundColor Yellow
Write-Host " 3. Tap 'Add to Home Screen' to install as a full-screen app!"
Write-Host "=========================================================="
Write-Host "Server is running! Press Ctrl + C to stop." -ForegroundColor DarkGray
Write-Host ""

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

try {
    while ($listener.Server.IsBound) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $buf = New-Object byte[] 4096
            $bytesRead = $stream.Read($buf, 0, 4096)
            if ($bytesRead -gt 0) {
                $req = [System.Text.Encoding]::UTF8.GetString($buf, 0, $bytesRead)
                $firstLine = $req.Split("`n")[0].Trim()
                $parts = $firstLine.Split(" ")
                if ($parts.Length -ge 2) {
                    $rawPath = $parts[1]
                    if ($rawPath.Contains("?")) { $rawPath = $rawPath.Substring(0, $rawPath.IndexOf("?")) }
                    if ($rawPath -eq "/" -or $rawPath -eq "") { $rawPath = "/index.html" }
                    
                    $localPath = [System.IO.Path]::Combine($baseDir, $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                    
                    if ([System.IO.File]::Exists($localPath)) {
                        $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                        $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
                        $fileBytes = [System.IO.File]::ReadAllBytes($localPath)
                        
                        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                        $stream.Write($hBytes, 0, $hBytes.Length)
                        $stream.Write($fileBytes, 0, $fileBytes.Length)
                        $stream.Flush()
                        Write-Host "[200 OK] $rawPath" -ForegroundColor DarkGreen
                    } else {
                        $header = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                        $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                        $stream.Write($hBytes, 0, $hBytes.Length)
                        $stream.Flush()
                        Write-Host "[404 Not Found] $rawPath" -ForegroundColor DarkYellow
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
