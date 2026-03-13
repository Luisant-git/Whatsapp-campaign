@echo off
echo Regenerating Prisma client with domain field...

echo.
echo Step 1: Generating Prisma client for central database...
npx prisma generate --schema=./prisma/schema-central.prisma

echo.
echo Step 2: Testing if domain field is accessible...
node test-domain-functionality.js

echo.
echo Done! If the test passes, your domain functionality should work.
pause