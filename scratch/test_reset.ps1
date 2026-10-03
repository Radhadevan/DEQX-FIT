Write-Host "=== TESTING DEQX FIT RESET AND FRESH START ONBOARDING SUITE ===" -ForegroundColor Cyan

$workspace = Split-Path -Parent $PSScriptRoot
$indexHtml = Get-Content "$workspace\index.html" -Raw -Encoding UTF8
$stateJs = Get-Content "$workspace\js\core\state.js" -Raw -Encoding UTF8
$modalsJs = Get-Content "$workspace\js\components\modals.component.js" -Raw -Encoding UTF8
$profileJs = Get-Content "$workspace\js\components\profile.component.js" -Raw -Encoding UTF8
$homeJs = Get-Content "$workspace\js\components\home.component.js" -Raw -Encoding UTF8
$foodJs = Get-Content "$workspace\js\components\food.component.js" -Raw -Encoding UTF8
$activityJs = Get-Content "$workspace\js\components\activity.component.js" -Raw -Encoding UTF8
$workoutJs = Get-Content "$workspace\js\components\workout.component.js" -Raw -Encoding UTF8
$progressJs = Get-Content "$workspace\js\components\progress.component.js" -Raw -Encoding UTF8
$budgetJs = Get-Content "$workspace\js\components\budget.component.js" -Raw -Encoding UTF8
$styleCss = Get-Content "$workspace\style.css" -Raw -Encoding UTF8

$allPassed = $true

function Assert-Test([string]$desc, [bool]$condition) {
  if ($condition) {
    Write-Host "  [PASS] $desc" -ForegroundColor Green
  } else {
    Write-Host "  [FAIL] $desc" -ForegroundColor Red
    $script:allPassed = $false
  }
}

Write-Host "`n1. VERIFYING ZERO ACTIVITY LEVEL REFERENCES:"
Assert-Test "No 'Activity Level' in Fresh Start screen" (-not ($indexHtml.Contains("Activity Level")))
Assert-Test "No 'Sedentary' in index.html" (-not ($indexHtml.Contains("Sedentary")))
Assert-Test "No 'Very Active' in index.html" (-not ($indexHtml.Contains("Very Active")))
Assert-Test "No 'activityLevel' in state.js" (-not ($stateJs.Contains("activityLevel")))

Write-Host "`n2. VERIFYING FRESH START ONBOARDING SCREEN DESIGN AND ELEMENTS:"
Assert-Test "DEQX FIT branding present" ($indexHtml.Contains("DEQX FIT"))
Assert-Test "TRAIN motto present" ($indexHtml.Contains("TRAIN"))
Assert-Test "FRESH START badge present" ($indexHtml.Contains("FRESH START"))
Assert-Test "'Let''s set you up' header present" ($indexHtml.Contains("Let's set you up"))
Assert-Test "'Enter your details to personalize your fitness journey.' subtitle present" ($indexHtml.Contains("Enter your details to personalize your fitness journey."))

Assert-Test "Card 1: PERSONAL INFORMATION present" ($indexHtml.Contains("PERSONAL INFORMATION"))
Assert-Test "Card 1: Subtitle 'Tell us a bit about yourself.' present" ($indexHtml.Contains("Tell us a bit about yourself."))
Assert-Test "Fields: Name, Age, Gender, Height present" ($indexHtml.Contains('id="onboardName"') -and $indexHtml.Contains('id="onboardAge"') -and $indexHtml.Contains('id="onboardGender"') -and $indexHtml.Contains('id="onboardHeight"'))
Assert-Test "Gender dropdown options: Male, Female, Prefer not to say" ($indexHtml.Contains('value="Male"') -and $indexHtml.Contains('value="Female"') -and $indexHtml.Contains('value="Prefer not to say"'))

Assert-Test "Card 2: CURRENT STATUS present" ($indexHtml.Contains("CURRENT STATUS"))
Assert-Test "Card 2: Subtitle 'Your current fitness details.' present" ($indexHtml.Contains("Your current fitness details."))
Assert-Test "Fields: Current Weight, Goal Weight present" ($indexHtml.Contains('id="onboardCurrentWeight"') -and $indexHtml.Contains('id="onboardTargetWeight"'))

Assert-Test "Card 3: DAILY TARGETS present" ($indexHtml.Contains("DAILY TARGETS"))
Assert-Test "Card 3: Subtitle 'Set your daily goals. You can change these later.' present" ($indexHtml.Contains("Set your daily goals. You can change these later."))
Assert-Test "Fields: Protein, Calories, Water, Daily Burn present" ($indexHtml.Contains('id="onboardProtein"') -and $indexHtml.Contains('id="onboardCalories"') -and $indexHtml.Contains('id="onboardWater"') -and $indexHtml.Contains('id="onboardBurn"'))
Assert-Test "Default values: 150g protein, 2200 kcal, 3L water, 500 kcal burn" ($indexHtml.Contains('id="onboardProtein"') -and $indexHtml.Contains('value="150"') -and $indexHtml.Contains('value="2200"') -and $indexHtml.Contains('value="3"') -and $indexHtml.Contains('value="500"'))

Assert-Test "Button: 'Save & Start My Journey' present" ($indexHtml.Contains("Save &amp; Start My Journey"))
Assert-Test "Arrow icon included on button" ($indexHtml.Contains('class="submitArrowIcon"'))

Write-Host "`n3. VERIFYING RESET CONFIRMATION MODAL AND TEXTS:"
Assert-Test "Reset Confirm Modal ID 'resetConfirmModal' present" ($indexHtml.Contains('id="resetConfirmModal"'))
Assert-Test "Title: 'Reset all DEQX FIT data?' present" ($indexHtml.Contains("Reset all DEQX FIT data?"))
Assert-Test "Warning: 'This will permanently erase your fitness tracking history...' present" ($indexHtml.Contains("This will permanently erase your fitness tracking history, food logs, activity logs, workout history, weight history, spending history, XP, level, streaks and custom data."))
Assert-Test "Buttons: CANCEL and RESET EVERYTHING present" ($indexHtml.Contains("CANCEL") -and $indexHtml.Contains("RESET EVERYTHING"))

Write-Host "`n4. VERIFYING PROFILE PAGE POST-ONBOARDING FIELDS:"
Assert-Test "Profile Name present" ($indexHtml.Contains('id="profileName"'))
Assert-Test "Profile Age present" ($indexHtml.Contains('id="profileAge"'))
Assert-Test "Profile Gender present" ($indexHtml.Contains('id="profileGender"'))
Assert-Test "Profile Height present" ($indexHtml.Contains('id="profileHeight"'))
Assert-Test "Profile Goal Weight present" ($indexHtml.Contains('id="profileGoal"'))
Assert-Test "Profile Protein Target present" ($indexHtml.Contains('id="profileProtein"'))
Assert-Test "Profile Water Target present" ($indexHtml.Contains('id="profileWaterTarget"'))
Assert-Test "Profile Calories Target present" ($indexHtml.Contains('id="profileCalories"'))
Assert-Test "Profile Daily Burn Target present" ($indexHtml.Contains('id="profileBurnTarget"'))
Assert-Test "Profile Budget present" ($indexHtml.Contains('id="profileBudget"'))

Write-Host "`n5. VERIFYING SAVE FEEDBACK TOASTS (SECTION 11):"
Assert-Test "Onboarding feedback: 'You''re all set'" ($modalsJs.Contains("You're all set"))
Assert-Test "Food feedback: 'Saved' and 'Meal added to today''s data'" ($foodJs.Contains("Saved") -and $foodJs.Contains("Meal added to today's data"))
Assert-Test "Activity feedback: 'Activity saved'" ($activityJs.Contains("Activity saved"))
Assert-Test "Workout feedback: 'Workout saved'" ($workoutJs.Contains("Workout saved"))
Assert-Test "Weight feedback: 'Weight saved'" ($progressJs.Contains("Weight saved") -and $profileJs.Contains("Weight saved"))
Assert-Test "Budget feedback: 'Spending saved'" ($budgetJs.Contains("Spending saved"))
Assert-Test "Profile goals feedback: 'Goals updated'" ($profileJs.Contains("Goals updated"))

Write-Host "`n6. VERIFYING HOME DASHBOARD BURN TARGET INTEGRATION:"
Assert-Test "Home burn target dynamic span 'burnTargetHome' present" ($indexHtml.Contains('id="burnTargetHome"'))
Assert-Test "Home component sets burnTargetHome" ($homeJs.Contains("burnTargetHome"))
Assert-Test "Home component computes burn percentage against d.burnTarget" ($homeJs.Contains("burnTarget"))

if ($allPassed) {
  Write-Host "`n==================================================" -ForegroundColor Green
  Write-Host "ALL DEQX FIT RESET AND ONBOARDING SUITE TESTS PASSED" -ForegroundColor Green
  Write-Host "==================================================" -ForegroundColor Green
} else {
  Write-Host "`n==================================================" -ForegroundColor Red
  Write-Host "SOME TESTS FAILED - REVIEW OUTPUT ABOVE" -ForegroundColor Red
  Write-Host "==================================================" -ForegroundColor Red
  exit 1
}
