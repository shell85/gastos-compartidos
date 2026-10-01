# Especificación maestra del proyecto

 ## 1\. Objetivo

 Desarrollar una aplicación web **mobile-first**, visualmente cuidada y desplegable como **PWA**, destinada a gestionar gastos compartidos entre varios usuarios.

 La aplicación permitirá:

 - Crear gastos.
- Asociar cada gasto a uno o varios usuarios.
- Dividir automáticamente el gasto a partes iguales entre los usuarios asociados.
- Registrar pagos realizados por cualquier usuario, independientemente de quién tenga asignado el gasto.
- Registrar pagos parciales.
- Marcar un gasto como totalmente pagado mediante la creación automática del pago restante.
- Editar y eliminar pagos.
- Eliminar gastos, incluyendo sus pagos asociados.
- Crear gastos recurrentes automáticamente mediante tareas programadas de Supabase.
- Consultar gastos pendientes y pagados.
- Consultar el saldo acumulado de cada usuario.
- Consultar un historial de operaciones.
- Funcionar sin autenticación de Supabase.
- Permitir que cada instalación introduzca sus propios parámetros de conexión a Supabase.
- Guardar dichos parámetros localmente en el navegador.
- Funcionar exclusivamente online.

 La aplicación no tendrá:

 - múltiples grupos;
- categorías;
- estadísticas;
- roles administrativos;
- autenticación;
- funcionamiento offline.

---

 # 2\. Arquitectura general

 La arquitectura será:

```
┌───────────────────────────────────────┐
│              Navegador                │
│                                       │
│   Aplicación Web / PWA                │
│   Mobile-first                        │
│                                       │
│   React + TypeScript                  │
│   UI responsive                       │
│                                       │
│   Configuración Supabase local        │
└───────────────────┬───────────────────┘
                    │
                    │ HTTPS
                    ▼
┌───────────────────────────────────────┐
│              Supabase                 │
│                                       │
│ PostgreSQL                            │
│ Row Level Security                    │
│ Database Functions                    │
│ Triggers                              │
│ Scheduled Jobs                        │
└───────────────────────────────────────┘
```

 La aplicación será un cliente directo de Supabase.

 No debe existir un backend propio intermedio.

---

 # 3\. Tecnología recomendada

 La IA desarrolladora deberá utilizar:

 - **React**
- **TypeScript**
- **Vite**
- **Supabase JavaScript Client**
- **Tailwind CSS**
- Una biblioteca de componentes moderna compatible con Tailwind, si resulta útil.
- PWA mediante `vite-plugin-pwa`.
- PostgreSQL de Supabase.
- Supabase Edge Functions únicamente cuando sean necesarias para tareas que no deban ejecutarse directamente desde el navegador.
- Supabase Cron / Scheduled Functions para generación de gastos recurrentes.

 La aplicación debe estar fuertemente tipada.

 No se permitirá utilizar `any` salvo casos excepcionalmente justificados.

---

 # 4\. Configuración de Supabase

 ## 4.1. Configuración inicial

 La aplicación no tendrá una URL de Supabase ni una clave de proyecto codificadas en el código fuente.

 Al iniciar por primera vez:

```
┌─────────────────────────────┐
│       Configuración         │
│                             │
│ URL de Supabase              │
│ [_________________________] │
│                             │
│ Clave publishable/anon       │
│ [_________________________] │
│                             │
│          [ Conectar ]        │
└─────────────────────────────┘
```

 La aplicación intentará establecer conexión.

 Si la conexión es válida, continuará con la aplicación.

 Si falla:

```
No se ha podido conectar con Supabase.
Comprueba la URL y la clave introducidas.
```

---

 ## 4.2. Almacenamiento

 La URL y la clave deberán almacenarse localmente en el navegador.

 Por ejemplo:

```
localStorage
```

 con claves claramente identificadas, como:

```
expenses_app.supabase_url
expenses_app.supabase_key
```

 No deben almacenarse en:

 - PostgreSQL;
- código fuente;
- variables públicas de build;
- cookies innecesarias.

 La configuración no se enviará a ningún servidor distinto de Supabase.

---

 ## 4.3. Cambio de configuración

 Aunque inicialmente no se necesita una función específica para cambiarla, debe existir internamente una forma controlada de borrar la configuración local para permitir una nueva configuración si fuese necesario durante mantenimiento.

 La interfaz normal no necesita destacar esta función.

---

 # 5\. Consideración de seguridad de la clave

 La clave utilizada deberá ser exclusivamente la **publishable/anon key**.

 Nunca se deberá solicitar, almacenar o introducir una:

```
service_role key
```

 en el navegador.

 La aplicación deberá documentar claramente esta restricción.

 La seguridad de la base de datos deberá descansar en Supabase RLS y en las funciones de base de datos correspondientes.

---

 # 6\. Modelo de datos

 No existen grupos.

 Habrá una única colección de usuarios para toda la instalación/base de datos.

 ## 6.1. Tabla `users`

```
users
-----
id              uuid PK
name            text NOT NULL
active          boolean NOT NULL DEFAULT true
created_at      timestamptz NOT NULL
updated_at      timestamptz NOT NULL
```

 ### Reglas

 - El nombre es obligatorio.
- No se permiten nombres vacíos.
- Los usuarios eliminados deben conservarse históricamente.
- "Eliminar usuario" significa realmente **desactivar**.
- Un usuario inactivo no puede utilizarse para nuevos gastos o pagos.
- Un usuario inactivo sí debe seguir apareciendo en información histórica.

---

 # 7\. Tabla de gastos

 ## `expenses`

```
expenses
--------
id                  uuid PK
description         text NOT NULL
amount              numeric(12,2) NOT NULL
expense_date        date NOT NULL
recurring_expense_id uuid NULL
created_at          timestamptz NOT NULL
created_by          uuid NULL
```

 Restricciones:

```
amount > 0
```

 `created_by` referencia al usuario local que estaba seleccionado cuando se creó.

 No debe ser una relación que impida conservar el historial si posteriormente ese usuario se desactiva.

---

 # 8\. Usuarios asociados al gasto

 ## `expense_participants`

```
expense_participants
--------------------
expense_id          uuid
user_id             uuid
assigned_amount     numeric(12,2)
```

 Primary key:

```
(expense_id, user_id)
```

 El `assigned_amount` se calculará automáticamente.

 Aunque actualmente todos los repartos sean iguales, guardar explícitamente el importe asignado es recomendable porque:

 - simplifica los cálculos;
- conserva exactamente qué correspondía pagar en el momento del gasto;
- evita depender de una división recalculada posteriormente;
- permite futuras ampliaciones.

---

 # 9\. Tabla de pagos

 ## `payments`

```
payments
--------
id                  uuid PK
expense_id          uuid NOT NULL
user_id             uuid NOT NULL
amount              numeric(12,2) NOT NULL
paid_at             timestamptz NOT NULL
created_at          timestamptz NOT NULL
updated_at          timestamptz NOT NULL
created_by          uuid NULL
```

 Un usuario puede realizar múltiples pagos sobre el mismo gasto.

 Por ejemplo:

```
Juan → 100 €
Juan → 50 €
Pedro → 200 €
```

 No es necesario consolidarlos.

---

 # 10\. Gastos recurrentes

 ## `recurring_expenses`

```
recurring_expenses
------------------
id                  uuid PK
description         text NOT NULL
amount              numeric(12,2) NOT NULL
frequency            enum
start_date           date NOT NULL
end_date             date NOT NULL
created_at           timestamptz NOT NULL
created_by           uuid NULL
active               boolean NOT NULL DEFAULT true
```

 Frecuencias permitidas:

```
weekly
monthly
quarterly
semiannual
annual
```

 La fecha final es inclusiva.

---

 # 11\. Relación de usuarios de gastos recurrentes

 ## `recurring_expense_participants`

```
recurring_expense_participants
------------------------------
recurring_expense_id    uuid
user_id                 uuid
```

 La división siempre será a partes iguales.

 Cada gasto generado heredará los participantes del gasto recurrente.

---

 # 12\. Identificación de gastos generados

 Cada gasto generado por una recurrencia deberá guardar:

```
recurring_expense_id
```

 Esto permite saber de qué configuración recurrente procede.

 Debe existir una restricción que impida generar dos veces la misma ocurrencia.

 Recomendación:

```
UNIQUE(recurring_expense_id, expense_date)
```

 Esto es **muy importante**.

 Si el Cron se ejecuta dos veces accidentalmente, nunca deberá crear dos gastos para la misma fecha.

---

 # 13\. Historial

 Crear tabla:

 ## `audit_log`

```
audit_log
---------
id                  uuid PK
user_id             uuid NULL
action              text NOT NULL
entity_type         text NOT NULL
entity_id           uuid NULL
description         text
metadata            jsonb
created_at          timestamptz NOT NULL
```

 Ejemplos de acciones:

```
CREATE_EXPENSE
DELETE_EXPENSE

CREATE_PAYMENT
UPDATE_PAYMENT
DELETE_PAYMENT

MARK_EXPENSE_PAID

CREATE_USER
UPDATE_USER
DEACTIVATE_USER
```

---

 # 14\. Principio fundamental del sistema

 Hay que separar completamente:

 ### Quién debe pagar

 Determinado por:

```
expense_participants
```

 ### Quién ha pagado

 Determinado por:

```
payments
```

 Nunca se debe asumir que son los mismos usuarios.

---

 # 15\. Reparto del gasto

 Si:

```
Gasto = 600 €
Usuarios = Juan, Pedro
```

 se crea:

```
Juan → 300 €
Pedro → 300 €
```

 Si son tres:

```
600 / 3 = 200 €
```

 ### División de céntimos

 Como puede existir un importe que no sea divisible exactamente por el número de usuarios, hay que definir una regla determinista.

 Ejemplo:

```
100 €
3 usuarios
```

 No se puede representar como tres cantidades de 33,33 €, porque sumarían 99,99 €.

 La aplicación deberá repartir los céntimos restantes de forma determinista.

 Por ejemplo:

```
Usuario 1 → 33,34 €
Usuario 2 → 33,33 €
Usuario 3 → 33,33 €
```

 La regla deberá ser:

 > Los céntimos sobrantes se asignan empezando por los usuarios ordenados por su UUID, o por un orden estable definido explícitamente.

 Nunca se debe depender del orden accidental de una consulta SQL.

---

 # 16\. Cálculo de pagos

 Para un gasto:

```
amount = 600
```

 y:

```
Juan = 300
Pedro = 200
```

 el total pagado es:

```
500 €
```

 Pendiente:

```
100 €
```

 Fórmula:

```
pending =
    expense.amount
    - SUM(payments.amount)
```

---

 # 17\. Estado del gasto

 El estado será derivado.

 ### Pendiente

```
paid = 0
```

 ### Parcialmente pagado

```
0 < paid < amount
```

 ### Pagado

```
paid = amount
```

 No es recomendable guardar `status` en la base de datos porque puede quedar inconsistente.

 Debe calcularse a partir de los datos reales.

---

 # 18\. Restricción de pagos

 Nunca se permitirá:

```
SUM(payments.amount) > expense.amount
```

 La validación debe existir:

 1. En la interfaz.
2. En la lógica cliente.
3. **En Supabase mediante una función/transacción o mecanismo equivalente.**

 No debe confiarse únicamente en JavaScript.

 Esto evita que dos operaciones simultáneas puedan provocar:

```
600 €
+ 400 €
+ 300 €
= 700 €
```

 por una condición de carrera.

---

 # 19\. Crear gasto

 Formulario:

```
Descripción
Importe
Fecha
Usuarios asociados
Periodicidad
Fecha límite
```

 Si no se selecciona periodicidad:

```
Periodicidad = ninguna
```

 El gasto se crea inmediatamente para:

```
expense_date = fecha seleccionada
```

 Por defecto, la fecha será la fecha actual.

---

 # 20\. Pagos durante la creación

 El formulario de creación debe permitir opcionalmente indicar cuánto ha pagado cada usuario.

 Ejemplo:

```
Gasto: 600 €

Usuarios:
☑ Juan
☑ Pedro

Pagos iniciales:

Juan   [ 600,00 € ]
Pedro  [   0,00 € ]
```

 También sería válido:

```
Juan   300 €
Pedro  300 €
```

 o:

```
Juan 600 €
Pedro 0 €
```

 El total de pagos iniciales nunca podrá superar el importe.

---

 # 21\. Gasto pagado por un único usuario

 Debe permitirse:

```
Gasto = 600 €
Asignados:
Juan 300 €
Pedro 300 €

Pago:
Juan 600 €
```

 Resultado:

```
Juan +300 €
Pedro -300 €
```

---

 # 22\. Gasto individual pagado por otra persona

 Debe permitirse:

```
Gasto = 200 €
Asignado:
Juan 200 €

Pago:
Pedro 200 €
```

 Resultado:

```
Juan +200 €
Pedro -200 €
```

 Esto es obligatorio.

---

 # 23\. Eliminar gastos

 Los gastos no se pueden editar.

 Se puede eliminar un gasto.

 Antes de eliminar:

```
¿Eliminar gasto?

Esta operación eliminará también todos
los pagos asociados.

Esta acción no se puede deshacer.

[Cancelar] [Eliminar]
```

 La eliminación debe realizarse mediante una operación transaccional.

 Al eliminar:

```
expense
expense_participants
payments
```

 deben eliminarse correctamente.

 También deberá registrarse:

```
DELETE_EXPENSE
```

 en el historial.

 El registro de auditoría debe conservar suficiente información para saber qué gasto fue eliminado, incluso aunque el `expense_id` ya no exista.

---

 # 24\. Modificar pagos

 Un pago sí puede modificarse.

 Ejemplo:

```
Pedro
200 €
```

 →

```
Pedro
150 €
```

 La nueva cantidad debe volver a comprobar la regla:

```
total de pagos <= importe
```

 Cada modificación debe registrarse.

---

 # 25\. Eliminar pagos

 Se podrá eliminar un pago.

 Confirmación:

```
¿Eliminar este pago?

Importe: 200,00 €
Usuario: Pedro

[Cancelar] [Eliminar]
```

 La eliminación debe registrarse en el historial.

---

 # 26\. Marcar gasto como totalmente pagado

 Si:

```
amount = 600
paid = 400
```

 y Pedro pulsa:

```
Marcar como pagado
```

 se solicita:

```
¿Quién realizará el pago restante?

[ Pedro ▼ ]

Importe:
200,00 €

[Cancelar] [Confirmar]
```

 Al confirmar se crea:

```
payment:
user = Pedro
amount = 200
```

 Nunca se debe modificar directamente el gasto para marcarlo como pagado.

 El pago debe existir realmente en `payments`.

---

 # 27\. Saldo

 Esta es una de las reglas centrales de la aplicación.

 Para cada usuario:

```
saldo =
    total pagado
    -
    total que le correspondía pagar
```

 Por tanto:

 ### Positivo

```
+300 €
```

 Significa:

 > Ha pagado 300 € más de lo que le correspondía.

 ### Negativo

```
-300 €
```

 Significa:

 > Ha pagado 300 € menos de lo que le correspondía.

 ### Cero

```
0 €
```

 Está equilibrado.

---

 # 28\. Gastos que afectan al saldo

 Todos los gastos con fecha:

```
<= hoy
```

 participan en el cálculo.

 Esto incluye:

 - gastos de varios usuarios;
- gastos de un único usuario;
- gastos completamente pagados;
- gastos parcialmente pagados.

 Los gastos futuros no cuentan.

---

 # 29\. Ejemplo de saldo

 Gasto 1:

```
600 €
Juan + Pedro

Juan paga 600 €
```

 Resultado:

```
Juan +300
Pedro -300
```

 Gasto 2:

```
200 €
Juan

Pedro paga 200 €
```

 Resultado:

```
Juan +200
Pedro -200
```

 Saldo acumulado:

```
Juan  +100 €
Pedro -100 €
```

 La interfaz deberá mostrar exactamente ese resultado.

---

 # 30\. Saldo con gastos parcialmente pagados

 El saldo se calculará utilizando el importe total asignado aunque el gasto todavía no esté completamente pagado.

 Ejemplo:

```
600 €
Juan + Pedro

Corresponde:
Juan 300
Pedro 300

Pagado:
Juan 300
```

 Saldo:

```
Juan   0 €
Pedro -300 €
```

 Los 300 € pendientes siguen siendo una obligación pendiente del gasto.

---

 # 31\. Gastos pendientes

 La pantalla principal deberá mostrar únicamente gastos:

```
expense_date <= today
```

 y:

```
paid < amount
```

 No importa si el usuario actual está asociado al gasto.

 Todos los usuarios pueden ver todos los gastos pendientes.

---

 # 32\. Gastos pagados

 Existirá una pantalla independiente para consultar los gastos completamente pagados.

 Debe permitir:

 - ordenar por fecha;
- consultar el detalle;
- consultar participantes;
- consultar pagos.

 No será necesario mostrar estadísticas.

---

 # 33\. Detalle de un gasto

 Al abrir un gasto:

```
Supermercado
13 septiembre 2026

Total
600,00 €

Pagado
400,00 €

Pendiente
200,00 €

Corresponde a:
Juan       300,00 €
Pedro      300,00 €

Pagos:
Juan       400,00 €
```

 Acciones:

```
Registrar pago
Marcar como pagado
Eliminar gasto
```

 Si está pagado:

```
Total
600,00 €

Pagado
600,00 €

Pendiente
0,00 €
```

---

 # 34\. Gastos recurrentes

 El gasto original es una ocurrencia real.

 Por ejemplo:

```
13/09/2026
Netflix
15 €
Mensual
```

 genera:

```
13/09/2026 → gasto original
01/10/2026 → nueva ocurrencia
01/11/2026 → nueva ocurrencia
01/12/2026 → nueva ocurrencia
...
```

 Los gastos generados son independientes.

 Cada uno tiene sus propios:

 - pagos;
- estado;
- participantes.

---

 # 35\. Regla de fechas recurrentes

 ## Semanal

 El siguiente gasto será exactamente:

```
+7 días
```

 manteniendo el día de la semana.

 Ejemplo:

```
13/09/2026
20/09/2026
27/09/2026
04/10/2026
```

 ## Mensual

 El siguiente gasto se genera el primer día del siguiente mes.

 Ejemplo:

```
28/02/2026
01/03/2026
01/04/2026
01/05/2026
```

 ## Trimestral

 Primer día del mes tres meses después.

```
28/02/2026
01/04/2026
01/07/2026
01/10/2026
```

 ## Semestral

 Primer día de seis meses después.

```
28/02/2026
01/07/2026
01/01/2027
```

 ## Anual

 Primer día de enero del año siguiente.

```
28/02/2026
01/01/2027
01/01/2028
```

 Estas reglas deben implementarse explícitamente y no delegarse a una suma genérica de meses que pueda producir resultados inesperados.

---

 # 36\. Fecha final recurrente

 La fecha final es inclusiva.

 Si:

```
start = 01/03/2026
end = 01/06/2026
monthly
```

 deben existir:

```
01/03
01/04
01/05
01/06
```

 No:

```
01/07
```

---

 # 37\. Generación automática

 La generación deberá realizarse mediante una tarea programada en Supabase.

 La tarea deberá:

 1. Buscar recurrencias activas.
2. Calcular qué ocurrencias deberían existir.
3. Buscar cuáles ya existen.
4. Crear las que falten.
5. No crear ninguna fuera de la fecha límite.
6. No crear duplicados.

 Debe ser **idempotente**.

 Es decir:

 > Ejecutar la tarea una vez o ejecutarla diez veces debe producir exactamente el mismo estado final.

---

 # 38\. Recuperación ante fallos del Cron

 La tarea no debe asumir que se ejecutó todos los días.

 Ejemplo:

```
Debería existir:

20/09
27/09
04/10
```

 pero el Cron falló durante dos semanas.

 Cuando vuelva a ejecutarse, deberá crear todas las ocurrencias pendientes.

 Por tanto, no se utilizará simplemente:

```
create next occurrence
```

 sino:

```
calculate all missing occurrences up to today
```

---

 # 39\. Usuarios y selección del usuario actual

 Como no existe autenticación, la aplicación necesitará conocer el usuario que está utilizando la interfaz.

 Al entrar por primera vez:

```
¿Quién eres?

[ Juan ▼ ]

[ Continuar ]
```

 El usuario seleccionado se almacenará localmente.

 Debe existir una opción visible para cambiar de usuario:

```
Usuario actual: Juan
Cambiar
```

 Esto será especialmente importante para:

 - crear gastos;
- registrar pagos;
- marcar gastos como pagados;
- historial.

---

 # 40\. Advertencia conceptual sobre identidad

 El historial debe considerarse un registro de actividad, no un mecanismo de autenticación.

 Si Pedro selecciona "Juan", el sistema no puede saber que realmente era Pedro.

 Esto es inherente al requisito de usuarios locales sin login.

 No se debe intentar solucionar mediante mecanismos de seguridad artificiales.

---

 # 41\. Historial

 El apartado de historial mostrará operaciones cronológicamente.

 Ejemplo:

```
Hoy

19:42 · Juan
Creó "Supermercado"
600,00 €

19:45 · Pedro
Registró un pago
200,00 €
Supermercado

19:47 · Juan
Marcó como pagado
Supermercado
```

 Debe poder consultarse el detalle de cada operación.

---

 # 42\. Diseño del historial

 La interfaz puede agrupar por fecha:

```
HOY

19:47
Juan
Marcó "Supermercado" como pagado

19:45
Pedro
Registró un pago de 200,00 €

AYER

18:21
María
Creó "Factura electricidad"
```

 No son necesarias estadísticas del historial.

---

 # 43\. Gestión de usuarios

 Pantalla:

```
Usuarios

Juan
Activo

Pedro
Activo

María
Inactivo

        + Añadir usuario
```

 Crear usuario:

```
Nombre
[________________]

[Cancelar] [Crear]
```

 No habrá roles.

 Todos los usuarios activos tienen las mismas capacidades.

---

 # 44\. Desactivación

 Al desactivar:

```
¿Desactivar a María?

No podrá utilizarse en nuevos gastos
o pagos, pero sus datos históricos
se conservarán.

[Cancelar] [Desactivar]
```

 No se elimina físicamente.

---

 # 45\. Navegación

 Una navegación móvil adecuada sería:

```
┌──────────────────────────┐
│                          │
│       CONTENIDO          │
│                          │
│                          │
├──────────────────────────┤
│ Inicio │ Gastos │ Más    │
└──────────────────────────┘
```

 Dentro de "Más":

 - Gastos pagados
- Historial
- Usuarios
- Configuración

 También podría utilizarse una navegación inferior de cuatro elementos si el diseño final lo permite.

---

 # 46\. Pantalla principal

 La pantalla principal será la más importante.

 Deberá destacar los saldos:

```
Tus saldos

Juan       +100,00 €
Pedro      -100,00 €
```

 Los positivos deben utilizar un color verde agradable.

 Los negativos, rojo.

 Pero no se deberá depender exclusivamente del color: utilizar también signos `+` / `−`.

 Después:

```
Gastos pendientes
```

 con tarjetas visualmente claras.

---

 # 47\. Tarjeta de gasto

 Ejemplo:

```
┌────────────────────────────┐
│ 🛒  Supermercado            │
│ 13 sep 2026                │
│                            │
│ Total              600,00 €│
│ Pendiente          200,00 €│
│                            │
│ Juan · Pedro               │
│                            │
│       Registrar pago       │
└────────────────────────────┘
```

 El diseño debe ser:

 - limpio;
- espacioso;
- legible;
- optimizado para interacción táctil;
- sin exceso de elementos.

---

 # 48\. Crear gasto

 Debe ser un flujo sencillo.

 ### Paso 1

```
Descripción
Importe
Fecha
```

 ### Paso 2

```
¿A quién corresponde?

☑ Juan
☑ Pedro
☐ María
```

 Mostrar inmediatamente:

```
600,00 €

Juan
300,00 €

Pedro
300,00 €
```

 ### Paso 3

```
¿Tiene periodicidad?

Ninguna
Semanal
Mensual
Trimestral
Semestral
Anual
```

 Si se selecciona una:

```
Fecha límite
```

 ### Paso 4

```
¿Hay pagos realizados?

Juan    [ 600,00 ]
Pedro   [   0,00 ]
```

 El formulario debe poder mostrar dinámicamente cuánto queda:

```
Pagado:    600,00 €
Pendiente:   0,00 €
```

---

 # 49\. Validaciones de interfaz

 ### Descripción

 Obligatoria.

 ### Importe

 Debe ser:

```
> 0
```

 Máximo razonable:

```
9999999999,99
```

 ### Usuarios

 Debe seleccionarse al menos uno.

 ### Pagos

 Cada importe:

```
>= 0
```

 y la suma:

```
<= importe total
```

 ### Periodicidad

 Si existe:

```
fecha límite >= primera fecha aplicable
```

 La aplicación debe mostrar errores claros y nunca permitir formularios inconsistentes.

---

 # 50\. Formato monetario

 Internamente:

```
numeric(12,2)
```

 Visualmente:

```
600,00 €
1.250,50 €
-300,00 €
```

 Debe utilizar formato español:

```
es-ES
```

 No debe mostrarse:

```
600.00 €
```

 en la interfaz española.

---

 # 51\. Fechas

 Las fechas de gastos deben ser fechas de calendario, no timestamps.

 En PostgreSQL:

```
date
```

 Los eventos/historial/pagos sí utilizarán:

```
timestamptz
```

 Esto evita problemas de zona horaria con fechas de gastos.

---

 # 52\. Zona horaria

 La interfaz deberá utilizar la zona horaria local del navegador para presentar fechas y horas.

 Los timestamps de auditoría y pagos se almacenarán como `timestamptz`.

 La lógica de generación recurrente debe definir explícitamente la zona horaria utilizada por la tarea programada para evitar que una ejecución cercana a medianoche genere una ocurrencia en una fecha incorrecta.

---

 # 53\. RLS

 Aunque no haya autenticación tradicional, el esquema debe utilizar RLS para proteger las tablas.

 Aquí existe una particularidad importante:

 > Una aplicación sin Supabase Auth no puede identificar criptográficamente al usuario local.

 Por tanto, las políticas deberán proteger la aplicación principalmente contra accesos accidentales/inconsistentes y no pretender proporcionar aislamiento por usuario local.

 La publishable/anon key podrá acceder únicamente a las operaciones que la aplicación necesita.

 Las operaciones críticas deberán pasar por funciones RPC controladas cuando sea necesario.

---

 # 54\. Operaciones transaccionales

 Estas operaciones deben ser atómicas:

 ### Crear gasto

 Debe crear conjuntamente:

```
expense
participants
initial payments
audit log
```

 Si una parte falla, no debe quedar el gasto parcialmente creado.

 ### Eliminar gasto

 Debe eliminar:

```
payments
participants
expense
```

 y registrar el historial de forma consistente.

 ### Crear pago

 Debe:

 1. comprobar importe pendiente;
2. comprobar usuario activo;
3. crear pago;
4. registrar historial.

 Todo dentro de una operación segura.

---

 # 55\. Crear gasto con pagos iniciales

 Se recomienda una función PostgreSQL/RPC:

```
create_expense(...)
```

 que reciba:

```
description
amount
expense_date
participants
initial_payments
recurrence information
created_by
```

 y realice todo el proceso.

 Esto evita que el cliente tenga que realizar una secuencia de múltiples inserts susceptibles de quedar a medias.

---

 # 56\. Registrar pago

 Igualmente, usar una operación transaccional:

```
create_payment(...)
```

 Debe comprobar dentro de PostgreSQL:

```
expense exists
user active
amount > 0
current total + new amount <= expense amount
```

 y crear el registro.

---

 # 57\. Marcar como pagado

 Debe existir una operación equivalente a:

```
pay_remaining_amount(...)
```

 que:

 1. calcula el pendiente actual;
2. comprueba que sea mayor que cero;
3. crea el pago exacto del pendiente;
4. registra la operación.

 Esto evita que dos usuarios intenten pagar simultáneamente el último importe y ambos creen pagos.

---

 # 58\. Cálculo del saldo

 Se recomienda implementar una consulta SQL o vista que permita obtener:

```
user_id
user_name
total_assigned
total_paid
balance
```

 donde:

```
balance = total_paid - total_assigned
```

 y solo se consideran gastos:

```
expense_date <= CURRENT_DATE
```

 Los usuarios inactivos deben poder incluirse si tienen actividad histórica.

---

 # 59\. Consultas optimizadas

 Crear índices sobre:

```
expenses(expense_date)
expenses(recurring_expense_id)
payments(expense_id)
payments(user_id)
expense_participants(expense_id)
expense_participants(user_id)
audit_log(created_at)
```

 Y las claves foráneas correspondientes.

---

 # 60\. Integridad referencial

 Relaciones:

```
expense
  ├── participants
  └── payments
```

 deberán utilizar eliminación en cascada cuando corresponda.

 Sin embargo, usuarios históricos no deberán eliminarse físicamente.

---

 # 61\. PWA

 La aplicación deberá ser instalable como PWA.

 Debe incluir:

 - manifest;
- iconos;
- nombre;
- nombre corto;
- colores;
- splash/launch apropiado;
- service worker.

 Como la aplicación no funcionará offline, no debe presentarse al usuario como una aplicación plenamente offline.

 El service worker puede encargarse de recursos estáticos, pero las operaciones de datos requieren conexión.

---

 # 62\. Responsive design

 Aunque la prioridad es móvil:

```
320px+
```

 debe funcionar correctamente en:

 - teléfonos;
- tablets;
- escritorio.

 En escritorio se puede utilizar un ancho máximo:

```
max-width: 1100px
```

 aproximadamente.

 La experiencia principal debe seguir siendo mobile-first.

---

 # 63\. UX

 La interfaz debe transmitir:

 - claridad;
- confianza;
- simplicidad;
- modernidad.

 Evitar:

 - formularios excesivamente largos;
- tablas complicadas en móvil;
- ventanas modales innecesarias;
- exceso de colores;
- animaciones lentas.

 Utilizar:

 - tarjetas;
- botones grandes;
- estados visuales claros;
- feedback inmediato;
- skeleton loaders;
- mensajes de éxito/error;
- confirmaciones únicamente cuando sean necesarias.

---

 # 64\. Estados de carga

 Todas las operaciones contra Supabase deberán tener estados:

```
idle
loading
success
error
```

 Nunca se deberá dejar al usuario preguntándose si una operación se ha realizado.

 Ejemplo:

```
Guardando...

✓ Gasto creado correctamente
```

---

 # 65\. Manejo de errores

 Los errores técnicos de Supabase no deberían mostrarse directamente al usuario.

 En lugar de:

```
PostgrestException: duplicate key...
```

 mostrar:

```
No se ha podido crear el gasto.
Comprueba la conexión e inténtalo de nuevo.
```

 Los errores técnicos deben quedar disponibles para logging/debug.

---

 # 66\. Confirmaciones

 Confirmar obligatoriamente:

 - eliminar gasto;
- eliminar pago;
- desactivar usuario.

 No hace falta confirmar:

 - crear gasto;
- registrar pago;
- modificar pago.

---

 # 67\. No editar gastos

 Una vez creado:

```
description
amount
expense_date
participants
```

 no podrán editarse.

 Si el usuario se equivoca:

 > eliminar y crear nuevamente.

 Esto debe reflejarse claramente en la interfaz.

---

 # 68\. Gastos recurrentes y edición

 Como el gasto individual no es editable, tampoco debe existir una edición de una ocurrencia individual.

 Las configuraciones recurrentes tampoco necesitan una interfaz compleja de edición en la primera versión.

 La aplicación puede limitarse a:

 - crear recurrencia;
- generar ocurrencias;
- consultar gastos generados.

 Si posteriormente se quiere cancelar una recurrencia, podría utilizarse:

```
active = false
```

 aunque no es necesario añadir una funcionalidad de edición completa.

---

 # 69\. Cancelación de recurrencias

 Recomiendo que la aplicación sí permita **desactivar una recurrencia**, aunque no sea una edición de los gastos ya creados.

 Ejemplo:

```
Netflix
Mensual
Próxima ocurrencia: 01/10/2026

[Desactivar recurrencia]
```

 Desactivarla no elimina gastos ya creados.

 Si quieres mantener estrictamente la funcionalidad mínima, esta opción puede aparecer únicamente en la gestión de recurrencias y no modificar ninguna ocurrencia histórica.

---

 # 70\. Arquitectura de frontend

 Una estructura razonable:

```
src/
├── app/
├── components/
│   ├── ui/
│   ├── expenses/
│   ├── payments/
│   ├── users/
│   └── layout/
├── pages/
│   ├── Home
│   ├── Expenses
│   ├── ExpenseDetail
│   ├── PaidExpenses
│   ├── History
│   ├── Users
│   └── Settings
├── services/
│   ├── supabase/
│   ├── expenses/
│   ├── payments/
│   ├── users/
│   └── audit/
├── hooks/
├── types/
├── utils/
└── lib/
```

 La estructura exacta puede cambiar si la IA encuentra una organización mejor, pero deberá mantenerse una separación clara entre:

 - UI;
- estado;
- acceso a datos;
- lógica de negocio.

---

 # 71\. Reglas que NO deben implementarse únicamente en React

 No confiar exclusivamente en:

```
if (total <= expense.amount)
```

 en frontend.

 La base de datos debe garantizar las reglas críticas.

 Especialmente:

 - pagos máximos;
- división correcta;
- creación transaccional;
- eliminación;
- recurrencias sin duplicados.

---

 # 72\. Casos de prueba obligatorios

 La IA desarrolladora deberá crear tests para como mínimo:

 ### Caso 1

```
600 €
Juan + Pedro
Juan paga 600 €
```

 Resultado:

```
Juan +300
Pedro -300
```

 ### Caso 2

```
200 €
Juan
Pedro paga 200 €
```

 Resultado:

```
Juan +200
Pedro -200
```

 ### Caso 3

 Combinar los anteriores:

```
Juan +100
Pedro -100
```

 ### Caso 4

```
600 €
Juan + Pedro
Juan 300
```

 Debe quedar:

```
pendiente = 300
```

 ### Caso 5

 Intentar pagar:

```
301 €
```

 cuando quedan:

```
300 €
```

 Debe rechazarse.

 ### Caso 6

 Dos pagos simultáneos que intentan superar el importe.

 Debe garantizarse que nunca se supere.

 ### Caso 7

 Eliminar gasto con pagos.

 Todos los pagos deben desaparecer.

 ### Caso 8

 Modificar un pago.

 El saldo debe recalcularse.

 ### Caso 9

 Eliminar un pago.

 El saldo debe recalcularse.

 ### Caso 10

 Gasto futuro.

 No debe afectar al saldo actual.

 ### Caso 11

 Gasto recurrente mensual.

 Debe producir las fechas correctas.

 ### Caso 12

 Cron ejecutado varias veces.

 No debe generar duplicados.

 ### Caso 13

 Cron que estuvo varios días sin ejecutarse.

 Debe recuperar todas las ocurrencias pendientes.

 ### Caso 14

 Fecha final inclusiva.

 Debe generarse la ocurrencia exactamente en la fecha límite.

 ### Caso 15

 Desactivar usuario.

 Debe desaparecer de nuevos formularios pero conservar historial.

 ### Caso 16

 Importe no divisible.

 Por ejemplo:

```
100 € / 3
```

 La suma de asignaciones debe ser exactamente:

```
100,00 €
```

 ### Caso 17

 Crear gasto con pagos iniciales.

 Todo debe crearse en una única operación consistente.

 ### Caso 18

 Marcar como pagado dos veces simultáneamente.

 Nunca debe superar el importe.

---

 # 73\. Criterios de aceptación

 El proyecto se considerará terminado cuando:

 - La aplicación pueda conectarse a cualquier proyecto Supabase compatible introduciendo URL + publishable/anon key.
- La configuración sobreviva al cierre del navegador.
- Se puedan crear usuarios.
- Los usuarios puedan desactivarse sin perder información histórica.
- Se puedan crear gastos individuales y compartidos.
- Los gastos se dividan correctamente.
- Cualquier usuario pueda realizar pagos.
- Los pagos parciales funcionen.
- Los pagos nunca puedan superar el importe.
- Los pagos puedan editarse y eliminarse.
- Los gastos puedan eliminarse con confirmación.
- La eliminación borre correctamente sus pagos.
- El saldo sea matemáticamente correcto.
- Los gastos futuros no afecten al saldo.
- Los gastos pagados desaparezcan de pendientes.
- Exista consulta de gastos pagados.
- Exista historial.
- Las recurrencias funcionen automáticamente.
- Las recurrencias sean idempotentes.
- No existan duplicados.
- La aplicación sea PWA.
- La interfaz sea completamente usable desde móvil.
- No exista dependencia de un backend propio.
- No se almacenen service-role keys en el cliente.

---

 # 74\. Punto especialmente importante: primera versión de Supabase

 Hay una cuestión arquitectónica que quiero remarcar antes de que una IA empiece a programar.

 **La base de datos Supabase no debería limitarse a ser una serie de tablas accesibles libremente desde el navegador.**

 Las operaciones importantes deben encapsularse en funciones PostgreSQL/RPC.

 La idea es:

```
Frontend
   │
   ├── consultar datos
   │
   ├── llamar create_expense()
   │
   ├── llamar create_payment()
   │
   ├── llamar pay_remaining()
   │
   └── llamar delete_expense()
           │
           ▼
       PostgreSQL
           │
       transacción
           │
       validaciones
           │
       datos
```

 Esto hace que la aplicación sea mucho más robusta.

---

 # 75\. Resultado conceptual final

 La aplicación gira alrededor de tres conceptos independientes:

```
                    ┌──────────────┐
                    │    GASTO     │
                    │              │
                    │ 600 €        │
                    └──────┬───────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
        ¿A quién corresponde?   ¿Quién pagó?
                 │                   │
                 ▼                   ▼
          PARTICIPANTS            PAYMENTS
                 │                   │
        Juan → 300 €          Juan → 600 €
        Pedro → 300 €
                 │                   │
                 └─────────┬─────────┘
                           ▼
                        SALDO
                           │
                 Juan → +300 €
                 Pedro → -300 €
```

 Esta separación es la clave de todo el diseño.

---

 # 76\. Prompt maestro para la IA desarrolladora

Desarrolla completamente la aplicación descrita en esta especificación.

 La implementación debe ser funcional, ejecutable y lista para producción. No debes limitarte a crear maquetas o componentes visuales.

 REGLA FUNDAMENTAL:\
 No inventes reglas de negocio que no estén especificadas aquí. Cuando una regla esté definida explícitamente, debes implementarla exactamente como se describe.

 La aplicación debe utilizar React + TypeScript + Vite, Supabase como backend/base de datos, Tailwind CSS y PWA.

 Debe ser mobile-first, responsive, visualmente atractiva, moderna y muy sencilla de utilizar.

 La aplicación no utilizará autenticación de Supabase. Los usuarios son usuarios locales almacenados en la propia base de datos. El usuario activo se selecciona desde la aplicación y se conserva localmente en el navegador.

 La aplicación debe permitir que el usuario introduzca la URL de su proyecto Supabase y su publishable/anon key. Nunca debe solicitar ni almacenar una service-role key.

 La URL y la clave deben conservarse localmente en el navegador para evitar tener que introducirlas nuevamente.

 La aplicación no tendrá múltiples grupos, categorías, estadísticas ni funcionamiento offline.

 Los gastos tienen:

 - descripción;
- importe;
- fecha;
- uno o varios usuarios asociados;
- pagos realizados;
- periodicidad opcional.

 Los usuarios asociados a un gasto representan a quién corresponde el gasto. Los pagos representan quién ha pagado realmente. Ambos conceptos son completamente independientes.

 El reparto es siempre a partes iguales.

 El saldo de cada usuario se calcula como:

 SALDO = TOTAL PAGADO - TOTAL QUE LE CORRESPONDE PAGAR

 Un saldo positivo significa que el usuario ha pagado de más y debe mostrarse en verde. Un saldo negativo significa que ha pagado de menos y debe mostrarse en rojo.

 El saldo es acumulativo hasta la fecha actual y no debe incluir gastos futuros.

 Los gastos asociados a un único usuario también participan en el cálculo del saldo.

 Cualquier usuario puede pagar cualquier gasto, aunque no esté asociado al mismo.

 Los pagos pueden ser parciales.

 La suma de todos los pagos de un gasto nunca puede superar su importe total.

 Esta regla debe garantizarse tanto en frontend como en PostgreSQL mediante operaciones transaccionales seguras para evitar condiciones de carrera.

 Los gastos no pueden editarse.

 Los gastos sí pueden eliminarse. Antes de eliminarlos debe solicitarse confirmación. Al eliminar un gasto también deben eliminarse sus pagos y participantes asociados.

 Los pagos sí pueden editarse y eliminarse.

 La acción "Marcar como pagado" no debe modificar artificialmente el estado del gasto. Debe crear un pago por exactamente el importe pendiente, asignándolo al usuario seleccionado.

 Los gastos completamente pagados no deben aparecer en la lista de gastos pendientes.

 Debe existir una pantalla independiente para consultar gastos pagados.

 Debe existir un historial de operaciones que registre quién realizó cada acción, cuándo la realizó y sobre qué elemento.

 El historial es un registro de actividad y no debe considerarse un mecanismo de autenticación.

 Los usuarios pueden desactivarse, pero no deben eliminarse físicamente si tienen información histórica. Un usuario inactivo no debe poder utilizarse en nuevos gastos o pagos, pero debe conservarse en los registros históricos.

 Los importes deben almacenarse en PostgreSQL como NUMERIC(12,2), nunca como FLOAT.

 La moneda es EUR y la interfaz debe utilizar formato español, por ejemplo:\
 600,00 €\
 1.250,50 €\
 -300,00 €

 Las fechas de los gastos deben almacenarse como DATE. Los timestamps de pagos e historial deben utilizar TIMESTAMPTZ.

 Los gastos recurrentes pueden ser:

 - semanal;
- mensual;
- trimestral;
- semestral;
- anual.

 La generación de gastos recurrentes debe realizarse mediante una tarea programada en Supabase.

 La tarea debe ser idempotente. Ejecutarla varias veces no puede generar duplicados.

 Si la tarea deja de ejecutarse durante varios días, cuando vuelva a ejecutarse debe crear todas las ocurrencias que deberían existir hasta ese momento y que todavía no existan.

 La fecha límite de una recurrencia es inclusiva.

 La periodicidad semanal suma exactamente siete días.

 Para periodicidad mensual, el siguiente gasto se genera el día 1 del mes siguiente.

 Para periodicidad trimestral, el siguiente gasto se genera el día 1 del mes correspondiente tres meses después.

 Para periodicidad semestral, el siguiente gasto se genera el día 1 del mes correspondiente seis meses después.

 Para periodicidad anual, el siguiente gasto se genera el día 1 de enero del año siguiente.

 Ejemplo:\
 gasto original 28/02/2026:\
 mensual → 01/03/2026\
 trimestral → 01/04/2026\
 semestral → 01/07/2026\
 anual → 01/01/2027

 Los gastos generados por una recurrencia son gastos independientes, cada uno con sus propios pagos y estado.

 Debe existir una restricción que impida generar dos veces la misma ocurrencia de una recurrencia.

 La creación de un gasto debe poder incluir pagos iniciales opcionales. La creación debe ser transaccional y no debe dejar datos parcialmente creados.

 Las operaciones críticas deben implementarse mediante funciones PostgreSQL/RPC cuando sea necesario para garantizar atomicidad e integridad.

 Como mínimo deben existir operaciones transaccionales seguras para:

 - crear gasto;
- registrar pago;
- marcar como pagado;
- eliminar gasto;
- modificar pago;
- eliminar pago.

 Implementa Row Level Security apropiadamente.

 No confíes exclusivamente en validaciones de React para garantizar integridad.

 La interfaz debe incluir como mínimo:

 - inicio;
- gastos pendientes;
- detalle de gasto;
- gastos pagados;
- historial;
- usuarios;
- configuración inicial de Supabase.

 El inicio debe mostrar de forma destacada el saldo acumulado de cada usuario y debajo los gastos pendientes.

 Los gastos pendientes deben poder pagarse directamente desde la interfaz.

 La interfaz debe ser especialmente cómoda en pantallas móviles, con botones táctiles, formularios claros, tarjetas y navegación sencilla.

 Debe existir feedback visual durante las operaciones:

 - loading;
- éxito;
- error.

 Los errores internos de Supabase no deben mostrarse directamente al usuario.

 La aplicación debe ser instalable como PWA.

 No debe prometer ni implementar funcionamiento offline.

 Antes de considerar terminada la implementación, crea y ejecuta pruebas que cubran como mínimo:

 1. gasto compartido pagado por una sola persona;
2. gasto individual pagado por otra persona;
3. combinación de varios gastos;
4. pagos parciales;
5. intento de superar el importe;
6. pagos simultáneos;
7. eliminación de gasto con pagos;
8. modificación de pagos;
9. eliminación de pagos;
10. gastos futuros;
11. periodicidad semanal;
12. periodicidad mensual;
13. periodicidad trimestral;
14. periodicidad semestral;
15. periodicidad anual;
16. fecha límite inclusiva;
17. ejecución repetida del Cron;
18. recuperación tras fallo del Cron;
19. usuarios desactivados;
20. reparto de importes no divisibles exactamente;
21. creación de gasto con pagos iniciales;
22. dos operaciones simultáneas de "marcar como pagado".

 No des por terminado el proyecto hasta que:

 - el código compile;
- los tests pasen;
- las migraciones de Supabase sean reproducibles desde cero;
- las funciones SQL estén incluidas;
- las políticas RLS estén incluidas;
- la PWA esté correctamente configurada;
- no existan claves secretas en el frontend;
- la aplicación pueda arrancar en una instalación limpia siguiendo únicamente las instrucciones proporcionadas.

 Genera también un README completo explicando:

 - requisitos;
- instalación;
- configuración;
- creación del proyecto Supabase;
- ejecución de migraciones;
- configuración del Cron;
- ejecución local;
- build de producción;
- despliegue;
- funcionamiento general de la aplicación.

 No sustituyas funcionalidades reales por mocks, datos hardcodeados o simulaciones.

 ## 77\. Mi recomendación final antes de programar

 Hay una última decisión técnica que considero especialmente importante: **no empezaría por el frontend**.

 1. **Diseñar y validar el esquema PostgreSQL.**
2. Crear las migraciones.
3. Crear constraints, índices y relaciones.
4. Crear las funciones RPC transaccionales.
5. Crear RLS.
6. Crear la generación de recurrencias.
7. Crear tests de base de datos.
8. Crear la capa TypeScript de acceso a Supabase.
9. Crear el modelo de estado del frontend.
10. Crear las pantallas.
11. Crear la PWA.
12. Realizar pruebas de integración.
13. Realizar pruebas específicas en móvil.
14. Revisar seguridad y configuración antes del despliegue.

 Así, **la lógica financiera queda protegida por PostgreSQL y no depende de que el frontend haya hecho correctamente los cálculos**.