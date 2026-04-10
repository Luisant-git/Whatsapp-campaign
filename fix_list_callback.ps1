$file = "d:\Whatsapp\backend\src\whatsapp\whatsapp.service.ts"
$content = Get-Content $file -Raw

# Pattern to find handleInteractiveMenu calls without list callback
$pattern = '(\s+)(async \(to, title, msg, buttons\) => \{\s+return this\.sendButtonsMessageDirect\(to, title, msg, buttons,\s+whatsappSettings\.accessToken,\s+whatsappSettings\.phoneNumberId,\s+tenantClient\s+\);\s+\}\s+)\)\.catch'

$replacement = '$1$2,
$1async (to, title, msg, buttonText, menuItems) => {
$1  return this.sendListMessageDirect(to, title, msg, buttonText, menuItems,
$1    whatsappSettings.accessToken,
$1    whatsappSettings.phoneNumberId,
$1    tenantClient
$1  );
$1}
$1).catch'

$newContent = $content -replace $pattern, $replacement

Set-Content $file $newContent -NoNewline
Write-Host "Fixed list callbacks"
