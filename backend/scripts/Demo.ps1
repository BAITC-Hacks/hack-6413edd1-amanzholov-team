param(
    [string]$BaseUrl = 'http://127.0.0.1:8000',
    [string]$Password = $env:DEMO_PASSWORD
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $Password) { throw 'Set DEMO_PASSWORD to the password used by the demo seed.' }

function Login-Demo([string]$Name) {
    $body = @{ login = $Name; password = $Password } | ConvertTo-Json
    $result = Invoke-RestMethod "$BaseUrl/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $body
    return @{ Authorization = "Bearer $($result.access_token)" }
}
function Invoke-Api([string]$Method, [string]$Path, [hashtable]$Headers, [object]$Body = $null, [string]$Key = '') {
    $requestHeaders = @{} + $Headers
    $requestHeaders['Idempotency-Key'] = if ($Key) { "demo-v1-$Key" } else { [guid]::NewGuid().ToString() }
    $params = @{ Uri = "$BaseUrl/api/v1$Path"; Method = $Method; Headers = $requestHeaders }
    if ($null -ne $Body) {
        $params['ContentType'] = 'application/json'
        $params['Body'] = $Body | ConvertTo-Json -Depth 20
    }
    return Invoke-RestMethod @params
}

$employee = Login-Demo 'employee'
$reviewer = Login-Demo 'reviewer'
$admin = Login-Demo 'admin'
$reviewerProfile = Invoke-Api 'Get' '/me' $reviewer
$map = Invoke-Api 'Get' '/me/career-map' $employee
if ($map.ready_for_review) {
    Write-Output 'Demo already completed; confirmed state is preserved.'
    $map | ConvertTo-Json -Depth 10
    exit 0
}
$skills = Invoke-Api 'Get' '/skills?limit=100' $employee
$skill = $skills.items | Where-Object external_id -EQ 'DEMO_PYTHON'
if (-not $skill) { throw 'Synthetic seed is missing.' }
$claim = Invoke-Api 'Post' '/me/skill-claims' $employee @{
    skill_id = $skill.id; claimed_level = 3; evidence = 'Synthetic demo work sample'
} 'claim'
$null = Invoke-Api 'Post' "/verification-requests/$($claim.id)/assignment" $admin @{
    assignee_user_id = $reviewerProfile.user.id
} 'assign'
$null = Invoke-Api 'Post' "/verification-requests/$($claim.id)/reviews" $reviewer @{
    decision = 'approved'; observed_level = 2; rubric = 'Synthetic practical exercise'; rationale = 'Observed working knowledge'
} 'review'
$vacancies = Invoke-Api 'Get' '/vacancies?limit=100' $employee
$vacancy = $vacancies.items | Where-Object title -EQ 'DEMO Python Junior+'
$null = Invoke-Api 'Put' '/me/career-goal' $employee @{ vacancy_id = $vacancy.id } 'goal'
$recommendations = Invoke-Api 'Post' '/recommendations' $employee @{}
if ($recommendations.items.Count -lt 1) { throw 'No eligible synthetic recommendation.' }
$activityId = $recommendations.items[0].activity_id
$simulation = Invoke-Api 'Post' '/simulations' $employee @{ activity_ids = @($activityId) }
$enrollment = Invoke-Api 'Post' "/activities/$activityId/enrollments" $employee @{} 'enroll'
$completion = Invoke-Api 'Post' "/enrollments/$($enrollment.id)/completion-requests" $employee @{
    evidence = 'Synthetic independently assessed exercise'
} 'complete-request'
$null = Invoke-Api 'Post' "/completion-requests/$($completion.id)/confirm" $reviewer @{} 'confirm'
$after = Invoke-Api 'Get' '/me/career-map' $employee
if (-not $after.ready_for_review -or $after.coverage -ne $simulation.coverage_after) {
    throw 'Confirmed progression does not match the simulation.'
}
if ($after.official_grade -ne 'Junior') { throw 'Grade changed without promotion decision.' }
$null = Invoke-Api 'Patch' '/me/preferences' $employee @{
    ui_mode = 'rpg'; locale = 'ru'; reduced_motion = $true
} 'preferences'
$rpg = Invoke-Api 'Get' '/me/career-map' $employee
if (($after | ConvertTo-Json -Depth 20 -Compress) -ne ($rpg | ConvertTo-Json -Depth 20 -Compress)) {
    throw 'UI preference changed business calculations.'
}
Write-Output 'Full synthetic journey verified.'
$after | ConvertTo-Json -Depth 10
