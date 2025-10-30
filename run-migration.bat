@echo off
REM Script pour exécuter la migration des tables Ports et Aéroports
REM Remplacez les valeurs par vos propres paramètres de connexion

echo ====================================
echo Migration Ports et Aéroports
echo ====================================
echo.

REM Paramètres de connexion PostgreSQL
set PGUSER=postgres
set PGDATABASE=velosi_db
set PGHOST=localhost
set PGPORT=5432

echo Connexion à la base de données: %PGDATABASE%
echo Host: %PGHOST%:%PGPORT%
echo User: %PGUSER%
echo.

REM Demander le mot de passe
set /p PGPASSWORD="Entrez le mot de passe PostgreSQL: "

echo.
echo Exécution de la migration...
echo.

psql -U %PGUSER% -d %PGDATABASE% -h %PGHOST% -p %PGPORT% -f migrations/create_ports_aeroports_tables.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo Migration réussie !
    echo ====================================
    echo.
    echo Tables créées:
    echo - ports (~30 ports d'exemple)
    echo - aeroports (~35 aéroports d'exemple)
    echo.
) else (
    echo.
    echo ====================================
    echo ERREUR lors de la migration
    echo ====================================
    echo.
    echo Vérifiez:
    echo - Que PostgreSQL est démarré
    echo - Les paramètres de connexion
    echo - Que la base de données existe
    echo.
)

pause
