# ⚡ INSTRUCCIONES RÁPIDAS - BEAR BEAT

## 🚀 EJECUTAR EL PROYECTO (2 minutos)

### 1️⃣ Abrir Terminal y ejecutar:

```bash
cd "/Users/gustavogarcia/Documents/CURSOR/BEAR BEAT 2027 3.0"
npm run dev
```

### 2️⃣ Abrir navegador:

```
http://localhost:3000
```

---

## 🗄️ CONFIGURAR BASE DE DATOS (3 minutos)

### 1️⃣ Ir a Supabase SQL Editor:

```
https://supabase.com/dashboard/project/mthumshmwzmkwjulpbql/sql/new
```

### 2️⃣ Abrir archivo en tu proyecto:

```
supabase/SETUP_COMPLETO.sql
```

### 3️⃣ Copiar TODO el contenido (Cmd+A, Cmd+C)

### 4️⃣ Pegar en SQL Editor de Supabase (Cmd+V)

### 5️⃣ Clic en "Run" (botón verde)

### 6️⃣ Verificar que salga: ✅ "Success"

---

## 👨‍💼 CREAR USUARIO ADMIN (2 minutos)

### Opción A: Crear nuevo usuario admin

**1. En Supabase Dashboard:**
```
Authentication > Users > Add user
```

**2. Llenar:**
```
Email: admin@bearbeat.com
Password: Admin123456
```

**3. Clic en "Create user"**

**4. Copiar el UUID del usuario** (primera columna)

**5. En SQL Editor ejecutar:**
```sql
UPDATE users SET role = 'admin' 
WHERE email = 'admin@bearbeat.com';
```

### Opción B: Hacer admin a tu usuario actual

**Si ya te registraste en la página:**

```sql
UPDATE users SET role = 'admin' 
WHERE email = 'TU-EMAIL-AQUI';
```

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### 1. Landing Page (/)
```bash
# Abrir: http://localhost:3000

Deberías ver:
✅ Logo Bear Beat en navbar
✅ "3,000 Videos Para DJs"
✅ Precio $350 MXN grande
✅ Botón azul "COMPRAR AHORA"
✅ Géneros del pack (ej. Bachata, Guaracha, Reggaeton…; 19 carpetas en Enero 2026)
✅ Sección "¿Cómo funciona?"
✅ FAQ
```

### 2. Login (/login)
```bash
# Abrir: http://localhost:3000/login

✅ Logo Bear Beat
✅ Formulario de login
✅ Botón Google
✅ Link "Olvidaste contraseña"
✅ Link "Crear cuenta"
```

### 3. Registro (/register)
```bash
# Abrir: http://localhost:3000/register

✅ Formulario: Nombre, Email, Contraseña
✅ Validaciones funcionando
```

### 4. Admin Panel (/admin)
```bash
# Abrir: http://localhost:3000/admin
# (Después de crear usuario admin)

✅ Dashboard con 4 KPIs
✅ 4 botones de navegación
✅ Tabla de últimas compras
```

---

## 🎯 FLUJO COMPLETO DE PRUEBA

### Como Usuario Normal:

```
1. Ve a http://localhost:3000
2. Haz clic en "COMPRAR AHORA"
3. Ve la página de checkout
4. (Por ahora es demo, no cobrará)
```

### Como Admin:

```
1. Ejecuta el SQL de actualización de role
2. Ve a http://localhost:3000/login
3. Inicia sesión con tu usuario admin
4. Ve a http://localhost:3000/admin
5. Explora las 4 secciones:
   - Dashboard (KPIs)
   - Usuarios (lista completa)
   - Compras (historial)
   - Packs (gestión)
```

---

## ⚠️ PROBLEMAS COMUNES

### "Failed to fetch" o errores de Supabase
```bash
# Solución:
1. Verifica que ejecutaste el schema.sql completo
2. Verifica que .env.local tiene las credenciales correctas
3. Refresca la página (Cmd+R)
```

### "Not authenticated" en /admin
```bash
# Solución:
1. Ve a /login
2. Inicia sesión
3. Verifica que tu usuario tiene role = 'admin' en la BD
```

### Puerto 3000 ocupado
```bash
# Usar otro puerto:
PORT=3001 npm run dev

# Abrir: http://localhost:3001
```

### Error de Node.js v25
```bash
# Ignorar el warning, el proyecto funciona igual
# O downgrade a Node v20 (LTS)
```

---

## 🎉 ¡LISTO!

Con estos 3 pasos (ejecutar, configurar DB, crear admin) ya tienes:
- ✅ Landing page funcionando
- ✅ Sistema de auth completo
- ✅ Panel de admin profesional
- ✅ Todo con branding Bear Beat

**¡Tu plataforma está LISTA!** 🐻✨

---

**Tiempo total de setup: ~7 minutos**

- 2 min: Ejecutar proyecto
- 3 min: Configurar BD
- 2 min: Crear admin

¡Disfruta tu plataforma Bear Beat! 🚀
