# Subir Bear Beat a GitHub (3 pasos)

Git ya está inicializado y el primer commit está hecho. **Solo falta crear el repo en GitHub y hacer push.**

---

## Paso 1 – Crear el repositorio en GitHub

1. Abre el navegador y entra a: **https://github.com/new**
2. Si no has iniciado sesión, inicia sesión en GitHub.
3. Rellena:
   - **Repository name:** `bear-beat` (o el nombre que quieras, sin espacios)
   - **Description:** (opcional) Bear Beat - Video Remixes DJ 2026
   - **Public**
   - **No** marques "Add a README" ni "Add .gitignore" (ya los tienes en el proyecto)
4. Clic en **Create repository**.

---

## Paso 2 – Copiar la URL del repo

En la página que te sale después de crear el repo verás algo como:

```
https://github.com/TU_USUARIO/bear-beat.git
```

O si usas SSH:

```
git@github.com:TU_USUARIO/bear-beat.git
```

**Cópiala** (cambia TU_USUARIO por tu usuario de GitHub).

---

## Paso 3 – En la Terminal, conectar y subir

Abre **Terminal** (en Mac: Buscar "Terminal").

1. Ve a la carpeta del proyecto:
   ```bash
   cd "/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0"
   ```

2. Conecta tu repo de GitHub (pega **tu** URL en lugar de la de abajo):
   ```bash
   git remote add origin https://github.com/TU_USUARIO/bear-beat.git
   ```
   (Si tu usuario es `gustavogarcia`, sería: `https://github.com/gustavogarcia/bear-beat.git`)

3. Sube el código:
   ```bash
   git push -u origin main
   ```

4. Si te pide usuario y contraseña de GitHub:
   - Usuario: tu usuario de GitHub
   - Contraseña: ya no se usa la contraseña normal; necesitas un **Personal Access Token**.  
     Crea uno aquí: https://github.com/settings/tokens → **Generate new token (classic)** → marca `repo` → Generar → **copia el token** y úsalo como contraseña cuando la Terminal te lo pida.

Cuando termine el `git push`, el proyecto estará en GitHub. Luego en Render conectas ese repo y listo.
