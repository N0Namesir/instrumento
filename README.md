# Cronómetro EPI-Aetheris

Herramienta para que el supervisor cronometre la prueba comparativa entre el método
**Tradicional** (boletines PDF del MINSAL) y **EPI-Aetheris** (tablero web). No mide nada por
sí sola: el supervisor presiona *Iniciar* cuando el operador lee la consulta y *Detener* cuando
el operador escribe la respuesta en su ficha de papel. La ficha en papel sigue siendo el
instrumento oficial; esta herramienta ayuda a llenarla y deja un respaldo.

## Cómo abrirlo

Es un solo archivo, `index.html`, sin librerías ni conexión a internet.

- **Laptop:** haga doble clic en `index.html` (Chrome, Edge, Firefox o Safari).
- **Celular:** copie `index.html` al teléfono y ábralo con el navegador, o publíquelo con
  GitHub Pages y abra el enlace. Use siempre el mismo navegador durante toda la sesión.
- La pantalla se mantiene encendida con la Screen Wake Lock API. Si el navegador no la
  soporta, la pantalla de medición lo indica; en ese caso suba el tiempo de apagado de
  pantalla del teléfono.

## Cómo usarlo durante la sesión

1. En **Inicio**, elija la versión (*Equipo*: 20 consultas, 40 mediciones; *Evaluador externo*:
   consultas N.º 2, 4, 7, 9 y 18, 10 mediciones), llene operador, supervisor, fecha y lugar, y
   presione **Comenzar sesión**.
2. En cada medición la pantalla muestra la consulta, el método y su orden (1.º o 2.º), y el
   punto de partida que debe tener abierto el operador.
3. **Iniciar** cuando el operador lee la consulta; **Detener** cuando escribe la respuesta. En
   laptop, la **barra espaciadora** hace lo mismo.
4. Al detener aparecen *Hora de inicio*, *Hora de fin* y *Tiempo (s)* para copiarlos a la ficha.
   Puede escribir *Observaciones* y marcar **No encontrado**.
5. **Siguiente** pasa a la próxima medición; **Anterior** y **Resumen** sirven para revisar.
6. **Deshacer** corrige la última acción (por ejemplo un Detener por error), pero solo hasta
   que se pasa a otra medición.
7. Una medición con datos no se puede iniciar de nuevo sin **Repetir medición**, que pide
   confirmación. El intento anterior no se borra: queda en el registro de repeticiones y se
   cuenta en la columna `repeticiones`.

Reglas de tiempo:

- Las horas se muestran en 24 h (`hh:mm:ss`), truncando los milisegundos.
- **Tiempo (s) = hora de fin − hora de inicio**, ya truncadas a segundos, para que la ficha sea
  coherente. Por eso puede diferir hasta 1 s del contador grande, que cuenta segundos reales.
- El máximo es **300 s**. Al llegar, la medición se detiene sola (fin = inicio + 300 s,
  tiempo = 300), queda como *No encontrado* y la pantalla avisa con destello, vibración y sonido.
  El contador cambia de color a partir de los 240 s.
- Si recarga la página con una medición en curso, sigue corriendo desde su hora de inicio original.

Todo se guarda en el navegador (`localStorage`) después de cada acción. No borre los datos del
sitio ni use una ventana privada. Al abrir la página con una sesión guardada, ofrece
**Continuar sesión** o **Nueva sesión**; esta última pide confirmación y permite exportar la
anterior, que se reemplaza solo cuando comienza la nueva.

## Cómo exportar

En **Resumen** (tabla con las mediciones en el mismo orden que la ficha):

- **Exportar CSV**: `cronometro_<version>_<fecha>_<operador>.csv`, UTF-8 con BOM, separador
  coma (se abre bien en LibreOffice y ONLYOFFICE). Columnas: `version, operador, supervisor,
  fecha, lugar, n, departamento, se, anio, metodo, orden, hora_inicio, hora_fin, tiempo_s,
  no_encontrado, repeticiones, observaciones, inicio_epoch_ms, fin_epoch_ms`.
  `no_encontrado` es `1` o `0` (vacío si la medición no se hizo).
- **Exportar JSON**: `cronometro_<version>_<fecha>_<operador>.json`, con el estado completo:
  horas de inicio y fin de la sesión y el registro de repeticiones.
- **Finalizar sesión** guarda la hora de fin de la sesión.

Exporte al terminar y, si la sesión es larga, también a mitad de camino.

## Pruebas

Requiere Node.js 18 o superior. Desde esta carpeta:

```
node --test tests.mjs
```

Las pruebas leen la lógica directamente de `index.html` (bloque `<script id="logica">`), así que
no hay código duplicado.
