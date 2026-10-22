# Agent News Daily: morning research run.
# Starts a fresh Claude Code session, which writes brief.json + article.json,
# then sends both to the site as drafts. You approve them in Telegram.
#
# Lives in C:\dearagent-daily on the 24/7 PC. Needs C:\dearagent-daily\.env with:
#   PUBLISH_TOKEN=...
# Run by Task Scheduler every morning (see install-task.ps1).

param([switch]$DryRun)
$ErrorActionPreference = "Stop"
# Windows PowerShell 5.1 pipes text to programs as ASCII unless told otherwise.
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $OutputEncoding
$Root = "C:\dearagent-daily"
$Site = "https://dearagent.org"
$News = "https://agentnewsdaily.com"

$melb = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId((Get-Date), "AUS Eastern Standard Time")
$Date = $melb.ToString("yyyy-MM-dd")
$DateLong = $melb.ToString("d MMMM yyyy", [Globalization.CultureInfo]::GetCultureInfo("en-AU"))
$RunName = if ($DryRun) { "$Date-dryrun" } else { $Date }
$Run = Join-Path $Root "runs\$RunName"
New-Item -ItemType Directory -Force -Path $Run | Out-Null
$Log = Join-Path $Run "run.log"
function Log($m) { $line = "$(Get-Date -Format s)  $m"; Write-Output $line; Add-Content -Encoding utf8 -Path $Log -Value $line }

$Token = (Get-Content (Join-Path $Root ".env") | Where-Object { $_ -match '^PUBLISH_TOKEN=' }) -replace '^PUBLISH_TOKEN=', ''
$Headers = @{ Authorization = "Bearer $Token" }

function Notify($text) {
  try {
    $body = [Text.Encoding]::UTF8.GetBytes((@{ text = $text } | ConvertTo-Json -Compress))
    Invoke-RestMethod -Method Post -Uri "$Site/api/notify" -Headers $Headers -ContentType "application/json; charset=utf-8" -Body $body | Out-Null
  } catch { Log "notify failed: $_" }
}

function Send-Draft($file) {
  $raw = Get-Content -Raw -Encoding UTF8 $file
  $null = $raw | ConvertFrom-Json   # throws if the JSON is broken
  $bytes = [Text.Encoding]::UTF8.GetBytes($raw)
  try {
    $r = Invoke-RestMethod -Method Post -Uri "$Site/api/drafts" -Headers $Headers -ContentType "application/json; charset=utf-8" -Body $bytes
    Log "sent $(Split-Path $file -Leaf): $($r.slug)"
  } catch {
    $detail = $_.ErrorDetails.Message
    throw "the site refused $(Split-Path $file -Leaf): $detail"
  }
}

try {
  Log "start $Date"

  # Is Claude still logged in, and is there plan usage left? Checked before the real run.
  $ErrorActionPreference = "Continue"
  $check = ("Reply with just the word ok" | & claude -p --tools "" --strict-mcp-config --permission-mode dontAsk 2>&1 | ForEach-Object { "$_" }) -join " "
  $ErrorActionPreference = "Stop"
  Log "login check: $check"
  if ($check -notmatch '(?i)\bok\b' -or $check -match '(?i)login|log in|auth|credential|api key|expired|unauthori') {
    if ($check -match '(?i)limit|quota|usage|rate') {
      Notify "Claude's usage limit is reached on the PC, so today's brief was skipped. It will try again tomorrow. Claude said: $check"
    } else {
      Notify "Claude is logged out on the 24/7 PC (IP-5), so today's brief was skipped. Fix: on that PC open a terminal, run 'claude', type /login and sign in with your Max account. Claude said: $check"
    }
    Log "stopping: login/usage problem"
    exit 2
  }

  # Recent briefs, so Claude doesn't repeat yesterday's stories.
  $recent = "(none yet)"
  try {
    $latest = Invoke-RestMethod -Uri "$News/brief/latest.json" -TimeoutSec 30
    # Titles only, reduced to plain characters, so nothing in them can read as instructions.
    $recent = ($latest.items | ForEach-Object {
      $t = (($_.title -replace "[^\p{L}\p{N}\s,'.:()-]", "") -replace "\s+", " ").Trim()
      "- " + $t.Substring(0, [Math]::Min(160, $t.Length))
    }) -join "`n"
  } catch { Log "no previous brief" }

  $prompt = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "prompt.md")
  $prompt = $prompt.Replace("{{DATE}}", $Date).Replace("{{DATE_LONG}}", $DateLong).Replace("{{RECENT}}", $recent)

  Remove-Item -ErrorAction SilentlyContinue (Join-Path $Run "brief.json"), (Join-Path $Run "article.json")
  Push-Location $Run
  # In PowerShell 5.1 a program's error output counts as an error, so don't stop on it here.
  $ErrorActionPreference = "Continue"
  try {
    # Fresh session every run. It gets ONLY web search and web fetch: no files, no commands, no MCP servers.
    # (This PC's Claude settings skip permission checks, so the tool list itself is the safety boundary.)
    $out = $prompt | & claude -p --model opus --tools "WebSearch,WebFetch" --allowedTools "WebSearch,WebFetch" --strict-mcp-config --permission-mode dontAsk --output-format json 2>&1 | ForEach-Object { "$_" }
    Log "claude exit code $LASTEXITCODE"
    $outText = $out -join "`n"
    Set-Content -Encoding utf8 -Path (Join-Path $Run "claude-output.json") -Value $outText
  } finally { Pop-Location; $ErrorActionPreference = "Stop" }

  # Pull the two JSON objects out of Claude's answer and save them for sending.
  $result = $null
  try { $result = ($outText.Substring($outText.IndexOf("{")) | ConvertFrom-Json).result } catch { Log "could not parse claude output: $_" }
  if ($result) {
    $m = [regex]::Match($result, '===BRIEF===\s*(?<b>\{[\s\S]*?\})\s*===ARTICLE===\s*(?<a>\{[\s\S]*?\})\s*(===INCIDENTS===\s*(?<i>\[[\s\S]*?\])\s*)?===END===')
    if ($m.Success) {
      Set-Content -Encoding utf8 -Path (Join-Path $Run "brief.json") -Value $m.Groups["b"].Value
      Set-Content -Encoding utf8 -Path (Join-Path $Run "article.json") -Value $m.Groups["a"].Value
      if ($m.Groups["i"].Success) { Set-Content -Encoding utf8 -Path (Join-Path $Run "incidents.json") -Value $m.Groups["i"].Value }
    } else {
      Log "answer did not contain the expected markers"
      $result | Out-File -Append -Encoding utf8 $Log
    }
  }

  $sent = @()
  foreach ($f in "brief.json", "article.json") {
    $path = Join-Path $Run $f
    if (Test-Path $path) {
      if ($DryRun) { $null = Get-Content -Raw -Encoding UTF8 $path | ConvertFrom-Json; Log "dry run: $f is valid JSON, not sent" } else { Send-Draft $path }
      $sent += $f
    } else { Log "missing $f" }
  }
  # Proposed tracker entries (usually none). Each arrives in Telegram with Add / Skip buttons.
  $incPath = Join-Path $Run "incidents.json"
  if ((Test-Path $incPath) -and -not $DryRun) {
    try {
      $incRaw = Get-Content -Raw -Encoding UTF8 $incPath
      # (PowerShell 5.1 turns "[]" into one empty item, so check for an empty list by text first.)
      $incs = if ($incRaw.Trim() -match '^\[\s*\]$') { @() } else { @($incRaw | ConvertFrom-Json) }
      if ($incs.Count -gt 0) {
        $payload = '{"incidents":' + $incRaw + '}'
        $null = Invoke-RestMethod -Method Post -Uri "$Site/api/incidents" -Headers $Headers -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($payload))
        Log "sent $($incs.Count) proposed tracker entries"
      } else { Log "no new tracker entries" }
    } catch { Log "tracker entries refused: $($_.ErrorDetails.Message)" }
  }

  if ($sent.Count -eq 0) {
    $tail = (Get-Content $Log -Tail 15) -join " "
    if ($tail -match '(?i)usage limit|limit reached|quota') { throw "Claude hit the Max plan usage limit during the run. It will try again tomorrow." }
    if ($tail -match '(?i)/login|logged out|expired|unauthori') { throw "Claude's login expired during the run. On the PC run 'claude' then /login." }
    throw "Claude didn't produce any drafts. See $Log on the PC."
  }
  if ($sent.Count -lt 2) { Notify "Only $($sent -join ', ') was produced today. See $Log on the PC." }
  Log "finished"
} catch {
  Log "FAILED: $_"
  Notify "FAILED on $Date : $_"
  exit 1
}
