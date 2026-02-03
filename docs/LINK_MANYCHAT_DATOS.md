# Enlace desde ManyChat para traer datos del suscriptor

Para que al hacer clic en el enlace **se guarden el ID y el nombre del suscriptor** (y luego aparezcan en el chat, en eventos y en atribución), la URL debe llevar estos parámetros.

---

## Formatos que funcionan

El sitio acepta **varios nombres de parámetro** (según cómo armes el link en ManyChat):

### Opción 1 (recomendada)
```
https://bear-beat2027.onrender.com/checkout?mc_id={{subscriber_id}}&fname={{first_name}}&utm_source=manychat&utm_medium=broadcast
```

### Opción 2 (nombres alternativos)
```
https://bear-beat2027.onrender.com/checkout?subscriber_id={{subscriber_id}}&first_name={{first_name}}&utm_source=manychat&utm_medium=broadcast
```

- **ID del suscriptor**: se acepta `mc_id`, `subscriber_id`, `user_id` o `contact_id`.  
  En ManyChat suele usarse **{{subscriber_id}}** o el campo que muestre el ID del contacto.
- **Nombre**: se acepta `fname`, `first_name` o `firstname`.  
  En ManyChat: **{{first_name}}**.
- **UTM**: `utm_source=manychat` y `utm_medium=broadcast` (o el medio que uses) para que la atribución salga bien.

---

## Qué hace el sitio al entrar por ese link

1. **Middleware**: Lee `mc_id`/`subscriber_id`/etc. y `fname`/`first_name`/etc., los guarda en cookies (`bb_mc_id`, `bb_user_name`) y redirige a la **misma ruta sin esos parámetros** (la URL queda limpia).
2. **Eventos**: En cada evento (page_view, start_checkout, etc.) se envía el `mc_id` dentro de `event_data` (desde la cookie).
3. **API track-event**: Si la cookie `bb_mc_id` existe y el cliente no mandó `mc_id`, se añade al evento en el servidor.
4. **Chat**: El widget lee `bb_user_name` para el saludo (“¡Hola [nombre]!”).

---

## Cómo armar el link en ManyChat

En el nodo **“Open URL”** o **“Open Website”**:

1. URL base: `https://bear-beat2027.onrender.com/checkout` (o `/` para la home).
2. Añade los query params. En ManyChat sueles tener:
   - **Subscriber ID**: puede aparecer como `{{subscriber_id}}`, `{{user_id}}` o en Custom Fields.
   - **First name**: `{{first_name}}`.
3. Ejemplo final en el campo URL:
   ```text
   https://bear-beat2027.onrender.com/checkout?mc_id={{subscriber_id}}&fname={{first_name}}&utm_source=manychat&utm_medium=broadcast
   ```

Si tu plantilla usa otros nombres de variable, no importa: el sitio acepta `subscriber_id`, `user_id`, `contact_id` para el ID y `first_name`, `firstname` para el nombre.

---

## Si antes no teníais la data

- El sitio **solo leía** `mc_id` y `fname`. Si el enlace de ManyChat usaba `subscriber_id` y `first_name`, los parámetros se ignoraban y no se guardaban cookies.
- **Ahora** se aceptan ambos formatos, así que da igual cómo venga el link (mc_id/subscriber_id/user_id y fname/first_name).  
- Además, en cada evento el servidor **añade el `mc_id` desde la cookie** si el cliente no lo envía, para no perder la relación con ManyChat.

Después de desplegar estos cambios, los **nuevos** clics que entren con cualquiera de los formatos de arriba sí tendrán datos; los clics antiguos no, porque nunca se guardaron las cookies.
