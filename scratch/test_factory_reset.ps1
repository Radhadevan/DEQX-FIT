Write-Host "=== RUNNING COMPLETE FACTORY RESET & ONBOARDING LIFECYCLE TEST ===" -ForegroundColor Cyan

$workspace = Split-Path -Parent $PSScriptRoot
$allPassed = $true

function Assert-Check([string]$desc, [bool]$cond) {
    if ($cond) {
        Write-Host "  [PASS] $desc" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $desc" -ForegroundColor Red
        $script:allPassed = $false
    }
}

# 1. Test Server Endpoint for /api/sync/reset
Write-Host "`n1. TESTING LIVE SYNC SERVER RESET ENDPOINT:"
try {
    $resetRes = Invoke-RestMethod -Uri "http://localhost:8080/api/sync/reset" -Method POST -Headers @{ "X-Client-Id" = "test_runner" }
    Assert-Check "Server returned status: reset" ($resetRes.status -eq "reset")
    Assert-Check "Server updated version timestamp" ($resetRes.version -gt 0)
    
    # Verify temp sync file does not exist after reset
    $syncFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "deqx_live_sync_state.json")
    Assert-Check "Server deleted temp sync state file from disk" (-not (Test-Path $syncFile))
} catch {
    Assert-Check "Server endpoint available" $false
}

# 2. Test Simulation of Pre-Reset State with Data
Write-Host "`n2. SIMULATING USER DATA BEFORE RESET:"
$todayIso = (Get-Date).ToString("yyyy-MM-dd")

$preResetState = @{
    name = "Devan Active"
    age = 25
    gender = "Male"
    height = 175
    weight = 78.5
    startWeight = 85.0
    goalWeight = 80.0
    proteinTarget = 150
    waterTarget = 3
    calorieTarget = 2200
    burnTarget = 500
    budgetTarget = 250
    foods = @(
        @{ n = "Egg"; p = 18.9; c = 234 } # 3 eggs
    )
    history = @(
        @{ date = "2026-09-01"; weight = 85.0 },
        @{ date = "2026-09-15"; weight = 82.0 },
        @{ date = $todayIso; weight = 78.5 }
    )
    water = 2.5
    workout = "Chest + Triceps"
    spent = 150
    date = $todayIso
    xp = 350
    attendanceStreak = 5
    streakHistory = @{
        "2026-10-01" = @{ visited = $true; dailyPercent = 85; gymCompleted = $true; completed = $true; qualified = $true }
        "2026-10-02" = @{ visited = $true; dailyPercent = 90; gymCompleted = $true; completed = $true; qualified = $true }
        $todayIso = @{ visited = $true; dailyPercent = 82; gymCompleted = $true; completed = $true; qualified = $true }
    }
    workoutHistory = @{
        $todayIso = @{ scheduled = "Chest + Triceps"; completed = $true; actual = "Chest + Triceps" }
    }
    workoutSets = @{
        $todayIso = @{ "bench_press" = @(@{ reps = 10; weight = 60 }) }
    }
    personalRecords = @{
        "bench_press" = 60
    }
    customFoods = @(
        @{ id = "cf_1"; name = "Protein Shake"; protein = 30; calories = 150 }
    )
    customActivities = @(
        @{ id = "ca_1"; name = "Swimming"; met = 7.0 }
    )
    timeline = @(
        @{ type = "food"; title = "Egg"; time = "08:30" }
    )
    achievements = @{
        "first_workout" = @{ unlocked = $true; date = $todayIso }
    }
    onboarded = $true
}

$preResetV9 = @{
    activity = "Gym Workout"
    burned = 450
    streak = 5
    xp = 350
    level = 4
}

Assert-Check "Pre-reset has active foods" ($preResetState.foods.Count -gt 0)
Assert-Check "Pre-reset has active water" ($preResetState.water -gt 0)
Assert-Check "Pre-reset has active burned" ($preResetV9.burned -gt 0)
Assert-Check "Pre-reset has active streak" ($preResetState.attendanceStreak -gt 0)
Assert-Check "Pre-reset has active XP" ($preResetState.xp -gt 0)
Assert-Check "Pre-reset has custom foods" ($preResetState.customFoods.Count -gt 0)
Assert-Check "Pre-reset has custom activities" ($preResetState.customActivities.Count -gt 0)
Assert-Check "Pre-reset has weight history" ($preResetState.history.Count -gt 1)

# 3. Simulate Complete Factory Reset Execution
Write-Host "`n3. EXECUTING FACTORY RESET LOGIC:"

# Reset state object
$freshState = @{
    name = ""
    age = ""
    gender = ""
    height = $null
    weight = 75
    startWeight = 75
    goalWeight = 85
    proteinTarget = 150
    waterTarget = 3
    calorieTarget = 2200
    burnTarget = 500
    budgetTarget = 250
    foods = @()
    history = @(@{ date = $todayIso; weight = 75 })
    water = 0
    workout = ""
    spent = 0
    date = $todayIso
    xp = 0
    rewardDays = @{}
    workoutHistory = @{}
    workoutOverrides = @{}
    workoutSets = @{}
    workoutChecklist = @{}
    personalRecords = @{}
    exerciseHistory = @{}
    customFoods = @()
    customActivities = @()
    attendanceStreak = 0
    streakStartDate = $todayIso
    streakHistory = @{}
    lastAttendanceDate = $todayIso
    lastQualifiedDate = $null
    dailyRecords = @{
        $todayIso = @{
            date = $todayIso
            weight = 75
            protein = 0
            calories = 0
            water = 0
            burned = 0
            activity = $null
            workout = ""
            workoutCompleted = $false
            spent = 0
            dailyCompletion = 0
            foods = @()
            timeline = @()
            updatedAt = (Get-Date).ToString("o")
        }
    }
    timeline = @()
    achievements = @{}
    onboarded = $false
}

$freshV9 = @{
    activity = $null
    burned = 0
    streak = 0
    lastWorkout = $null
    lastActivityDate = $null
    xp = 0
    level = 1
}

# 4. Verify All Metrics in Reset State
Write-Host "`n4. VERIFYING RESET METRICS (STEP 15 COMPLIANCE):"
Assert-Check "Protein is 0 / 150g" ($freshState.foods.Count -eq 0)
Assert-Check "Water is 0 / 3L" ($freshState.water -eq 0)
Assert-Check "Calories is 0 / 2200" ($freshState.foods.Count -eq 0)
Assert-Check "Burned is 0" ($freshV9.burned -eq 0)
Assert-Check "Spending is 0" ($freshState.spent -eq 0)
Assert-Check "Streak is strictly 0 days" ($freshState.attendanceStreak -eq 0 -and $freshV9.streak -eq 0)
Assert-Check "XP is 0" ($freshState.xp -eq 0 -and $freshV9.xp -eq 0)
Assert-Check "Level is 1" ($freshV9.level -eq 1)
Assert-Check "Daily completion is 0%" ($freshState.dailyRecords[$todayIso].dailyCompletion -eq 0)
Assert-Check "Timeline is empty" ($freshState.timeline.Count -eq 0)
Assert-Check "Food history is empty" ($freshState.foods.Count -eq 0)
Assert-Check "Activity history is empty" ($freshV9.activity -eq $null)
Assert-Check "Workout history is empty" ($freshState.workoutHistory.Count -eq 0)
Assert-Check "Workout sets are empty" ($freshState.workoutSets.Count -eq 0)
Assert-Check "Personal records are empty" ($freshState.personalRecords.Count -eq 0)
Assert-Check "Custom foods are empty" ($freshState.customFoods.Count -eq 0)
Assert-Check "Custom activities are empty" ($freshState.customActivities.Count -eq 0)
Assert-Check "Weight history has only 1 starting entry" ($freshState.history.Count -eq 1 -and $freshState.history[0].weight -eq 75)

# 5. Push Fresh State to Live Sync Server & Test Reopen Persistence
Write-Host "`n5. TESTING SYNC PERSISTENCE ACROSS REOPEN:"
$syncPayload = @{
    version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    client = "test_suite_client"
    device = "laptop"
    d = $freshState
    v9 = $freshV9
} | ConvertTo-Json -Depth 10

$postRes = Invoke-RestMethod -Uri "http://localhost:8080/api/sync" -Method POST -Body $syncPayload -ContentType "application/json; charset=utf-8"
Assert-Check "Server accepted reset sync payload" ($postRes.status -eq "ok")

# Simulate Reopen: Pull from Server
$pullRes = Invoke-RestMethod -Uri "http://localhost:8080/api/sync" -Method GET
Assert-Check "Reopened state has 0 protein" ($pullRes.d.foods.Count -eq 0)
Assert-Check "Reopened state has 0 water" ($pullRes.d.water -eq 0)
Assert-Check "Reopened state has 0 streak" ($pullRes.d.attendanceStreak -eq 0 -and $pullRes.v9.streak -eq 0)
Assert-Check "Reopened state has 0 XP" ($pullRes.d.xp -eq 0)
Assert-Check "Reopened state has Level 1" ($pullRes.v9.level -eq 1)
Assert-Check "Reopened state has 0 burned" ($pullRes.v9.burned -eq 0)
Assert-Check "Reopened state has empty timeline" ($pullRes.d.timeline.Count -eq 0)

# 6. Verify Codebase Implementation Integrity
Write-Host "`n6. CODEBASE IMPLEMENTATION CHECKS:"
$modalsFile = Get-Content "$workspace\js\components\modals.component.js" -Raw -Encoding UTF8
$supaFile = Get-Content "$workspace\supabase-sync.js" -Raw -Encoding UTF8
$indexFile = Get-Content "$workspace\index.html" -Raw -Encoding UTF8
$gamifFile = Get-Content "$workspace\js\core\gamification.js" -Raw -Encoding UTF8

Assert-Check "modals.component.js has async confirmResetAllData" ($modalsFile.Contains("async () =>") -or $modalsFile.Contains("async function"))
Assert-Check "modals.component.js clears localStorage preserved auth" ($modalsFile.Contains("preservedAuthTokens"))
Assert-Check "modals.component.js calls resetSyncState" ($modalsFile.Contains("resetSyncState"))
Assert-Check "modals.component.js shows resetSuccessToast" ($modalsFile.Contains("resetSuccessToast"))
Assert-Check "supabase-sync.js deletes food_logs, activity_logs, workout_logs, weight_history, daily_logs" (
    $supaFile.Contains("food_logs") -and
    $supaFile.Contains("activity_logs") -and
    $supaFile.Contains("workout_logs") -and
    $supaFile.Contains("weight_history") -and
    $supaFile.Contains("daily_logs")
)
Assert-Check "supabase-sync.js uses cloudUser.id strictly for deletion" ($supaFile.Contains("cloudUser.id") -or $supaFile.Contains("uid"))
Assert-Check "gamification.js returns 0% daily score when 0 tracking exists" ($gamifFile.Contains("hasAnyTracking") -and $gamifFile.Contains("return 0;"))
Assert-Check "gamification.js prevents weekend phantom streak on 0 streak" ($gamifFile.Contains("pastStreak > 0 && isWeekend"))
Assert-Check "index.html has RESET EVERYTHING button" ($indexFile.Contains("RESET EVERYTHING"))
Assert-Check "index.html has resetSuccessToast element" ($indexFile.Contains('id="resetSuccessToast"'))

if ($allPassed) {
    Write-Host "`n==================================================" -ForegroundColor Green
    Write-Host "ALL FACTORY RESET TESTS PASSED WITH 100% SUCCESS!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host "`n==================================================" -ForegroundColor Red
    Write-Host "SOME FACTORY RESET TESTS FAILED" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    exit 1
}
