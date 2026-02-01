# Cómo configurar Render MCP en Cursor (paso a paso)

Así Cursor podrá revisar logs y estado de tu app en Render cuando algo falle.  
**Tiempo:** unos 3 minutos. **Necesitas:** tu API Key de Render (ya la tienes).

---

## Paso 1: Copiar tu API Key de Render

1. Abre el navegador y entra a: **https://dashboard.render.com**
2. Inicia sesión si te lo pide.
3. Arriba a la derecha haz clic en tu **nombre** o **avatar**.
4. Elige **Account Settings** (Configuración de la cuenta).
5. En el menú de la izquierda busca **API Keys** y haz clic.
6. Verás tu API Key (una línea larga que empieza con `rnd_...`).  
   - Si no hay ninguna, haz clic en **Create API Key**, ponle un nombre (ej. "Cursor") y créala.
7. Haz clic en **Copy** (o selecciona la key y cópiala con Cmd+C).  
   **No la compartas con nadie.** Guárdala en un lugar seguro (ej. Notas) por si la necesitas después.

---

## Paso 2: Abrir la carpeta donde Cursor guarda la configuración

En Mac, la carpeta de Cursor está "escondida" en tu usuario. Sigue esto:

**Opción A – Desde Cursor (más fácil)**  
1. Abre **Cursor**.  
2. Menú **File** → **Open File** (o **Abrir archivo**).  
3. Pulsa **Cmd+Shift+G** (Ir a carpeta).  
4. Escribe exactamente: `~/.cursor` y pulsa **Enter**.  
5. Si ves **mcp.json**, selecciónalo y ábrelo. Si no existe, en la misma ventana usa **File** → **New File** y guarda el archivo como **mcp.json** en esa carpeta.

**Opción B – Desde Finder**  
1. Abre **Finder**.  
2. Menú **Go** (Ir) → **Go to Folder...** (Ir a la carpeta).  
3. Escribe: `~/.cursor` y pulsa **Go**.  
4. Si ves **mcp.json**, haz doble clic para abrirlo (con Cursor o TextEdit). Si no existe, crea un archivo nuevo y nómbralo **mcp.json** (guárdalo en esa carpeta).

---

## Paso 3: Pegar la configuración de Render

Abre el archivo **mcp.json** (en Cursor o en TextEdit).

- **Si el archivo está vacío o no existe,** pega exactamente esto (y en el siguiente paso sustituyes la key):

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer AQUI_PEGA_TU_API_KEY"
      }
    }
  }
}
```

- **Si ya tienes otras cosas en `mcp.json`** (por ejemplo otros servidores), entonces solo añade el bloque de Render.  
  Ejemplo: si ya tienes algo así:

```json
{
  "mcpServers": {
    "otra-cosa": { ... }
  }
}
```

cámbialo a esto (añadiendo el bloque `"render": { ... }`):

```json
{
  "mcpServers": {
    "otra-cosa": { ... },
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer AQUI_PEGA_TU_API_KEY"
      }
    }
  }
}
```

---

## Paso 4: Poner tu API Key en el archivo

1. Busca en el archivo el texto: **AQUI_PEGA_TU_API_KEY**
2. Bórralo y pega en su lugar tu API Key de Render (la que copiaste en el Paso 1).  
   No dejes espacios antes ni después. Debe quedar algo como:  
   `"Authorization": "Bearer rnd_xxxxxxxxxxxx"`
3. Guarda el archivo (Cmd+S).

---

## Paso 5: Reiniciar Cursor

1. Cierra Cursor por completo (Cursor → Quit Cursor, o Cmd+Q).
2. Vuelve a abrir Cursor y abre tu proyecto de Bear Beat.

---

## Paso 6: Decirle a Cursor en qué workspace de Render trabajar (solo la primera vez)

Cuando quieras que te ayude a revisar algo en Render (por ejemplo "¿por qué falló el último deploy?"), en el chat de Cursor escribe algo como:

**"Set my Render workspace to [nombre de tu workspace]"**

El nombre del workspace lo ves en Render: en **https://dashboard.render.com** es el nombre que aparece arriba a la izquierda (donde ves tus proyectos). Si no lo sabes, puedes escribir:

**"List my Render workspaces"**

y Cursor te dirá los nombres; luego eliges uno y dices:

**"Set my Render workspace to [ese nombre]"**

---

## Listo

A partir de ahora, cuando algo falle en Render (build, sitio caído, etc.), puedes escribir en Cursor cosas como:

- *"Pull the most recent error-level logs for my Bear Beat service"*
- *"Why isn't my site at bear-beat2027.onrender.com working?"*
- *"What was the last deploy status for my web service?"*

y Cursor podrá usar Render para ayudarte a depurar.

---

**Si algo no te cuadra:** dime en qué paso te quedaste (1, 2, 3…) y qué ves en pantalla, y te guío con eso.
