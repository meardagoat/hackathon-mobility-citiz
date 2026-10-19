# Script de test du projet frontend Hackathon Mobilité
Write-Host "=== Test du Projet Frontend ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "c:\Users\prosp\Desktop\hackathon_mobility_frontend"
Set-Location $projectPath

# Test 1: Vérifier que node et npm sont installés
Write-Host "[1/4] Vérification de Node.js et npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "  ✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js ou npm non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Vérifier node_modules
Write-Host "[2/4] Vérification des dépendances..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  ✓ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "  ✗ node_modules absent - Exécution de npm install..." -ForegroundColor Yellow
    npm install
}

Write-Host ""

# Test 3: Lancer le build
Write-Host "[3/4] Lancement de npm run build..." -ForegroundColor Yellow
Write-Host "  (Ceci peut prendre 30-60 secondes)" -ForegroundColor Gray
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Build réussi!" -ForegroundColor Green
} else {
    Write-Host "  ✗ Build échoué" -ForegroundColor Red
    Write-Host "Sortie d'erreur:" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Proposer de lancer dev
Write-Host "[4/4] Projet vérifié avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "Pour démarrer le serveur de développement, exécutez:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Le serveur sera accessible sur:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""

$answer = Read-Host "Voulez-vous démarrer le serveur maintenant? (o/n)"
if ($answer -eq "o" -or $answer -eq "O" -or $answer -eq "y" -or $answer -eq "Y") {
    Write-Host ""
    Write-Host "Démarrage du serveur..." -ForegroundColor Cyan
    npm run dev
}
