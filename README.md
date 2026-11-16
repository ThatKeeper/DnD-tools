# DnD Tools

HUD en español con vistas previas interactivas de la libreta y el mapa. Cada app también se puede abrir por separado desde el HUD.

## Probar localmente

Compila el mapa y prepara la misma estructura que publica GitHub Pages:

```powershell
Set-Location Mapa
npm ci
npm run build
Set-Location ..
$site = ".\site"
New-Item -ItemType Directory -Force "$site\Mapa" | Out-Null
Copy-Item ".\index.html" "$site\"
Copy-Item ".\assets", ".\Libreta", ".\src" "$site\" -Recurse -Force
Copy-Item ".\Mapa\dist\*" "$site\Mapa\" -Recurse -Force
```

Sirve la carpeta `site` con cualquier servidor web estatico; no abras el HTML directamente con `file://`.

## Publicar en GitHub Pages

El workflow de GitHub Actions compila el mapa, prepara las rutas relativas y publica el HUD, los iconos y ambas apps al hacer push a `main` o `master`. En GitHub, selecciona **Settings > Pages > Source: GitHub Actions**.

La libreta y el mapa guardan los datos en el almacenamiento local del navegador; no se sincronizan entre dispositivos.
