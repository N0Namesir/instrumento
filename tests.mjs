// Pruebas de la lógica pura. Ejecutar con:  node --test
// No hay copia del código: se extrae el bloque <script id="logica"> de index.html y se evalúa aquí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');
const bloque = html.match(/<script id="logica">([\s\S]*?)<\/script>/);
assert.ok(bloque, 'No se encontró <script id="logica"> en index.html');
// Mismo contexto que las pruebas (no `vm`): así los arrays comparten prototipo y deepStrictEqual funciona.
const EPI = new Function(bloque[1] + '\nreturn EPI;')();

// Marca de tiempo en hora LOCAL (igual que la muestra el cronómetro), sin depender de la zona horaria.
const t = (h, m, s, ms = 0) => new Date(2026, 8, 29, h, m, s, ms).getTime();
const T = EPI.TRADICIONAL;
const E = EPI.EPI_AETHERIS;

// ---------- Orden de métodos ----------

test('N.º impar empieza con Tradicional y N.º par con EPI-Aetheris', () => {
  for (const n of [1, 3, 7, 9, 19]) assert.deepEqual(EPI.ordenMetodos(n), [T, E], 'n=' + n);
  for (const n of [2, 4, 6, 18, 20]) assert.deepEqual(EPI.ordenMetodos(n), [E, T], 'n=' + n);
});

test('N.º de consulta inválido lanza error', () => {
  for (const n of [0, -1, 1.5, '3', null]) assert.throws(() => EPI.ordenMetodos(n), undefined, String(n));
});

test('la versión externa usa el N.º original: la consulta 7 empieza con Tradicional', () => {
  const ms = EPI.generarMediciones('externo');
  const c7 = ms.filter((m) => m.n === 7);
  assert.deepEqual(c7.map((m) => [m.metodo, m.orden]), [[T, 1], [E, 2]]);
  const c2 = ms.filter((m) => m.n === 2);
  assert.deepEqual(c2.map((m) => [m.metodo, m.orden]), [[E, 1], [T, 2]]);
  // Si se usara la posición en la lista (la consulta 7 es la 3.ª), saldría al revés.
});

// ---------- Generación de mediciones ----------

test('la sesión del equipo genera 40 mediciones y la externa 10', () => {
  assert.equal(EPI.generarMediciones('equipo').length, 40);
  assert.equal(EPI.generarMediciones('externo').length, 10);
});

test('la sesión del equipo cubre las 20 consultas, cada una con los dos métodos', () => {
  const ms = EPI.generarMediciones('equipo');
  assert.deepEqual([...new Set(ms.map((m) => m.n))], Array.from({ length: 20 }, (_, i) => i + 1));
  for (const n of ms.map((m) => m.n)) {
    assert.deepEqual(ms.filter((m) => m.n === n).map((m) => m.metodo).sort(), [E, T]);
  }
});

test('la sesión externa conserva el N.º original y el orden de la ficha', () => {
  const ms = EPI.generarMediciones('externo');
  assert.deepEqual(ms.map((m) => m.n), [2, 2, 4, 4, 7, 7, 9, 9, 18, 18]);
  assert.deepEqual(ms.filter((m) => m.orden === 1).map((m) => [m.n, m.departamento, m.se, m.anio]), [
    [2, 'Usulután', 33, 2022],
    [4, 'San Salvador', 51, 2021],
    [7, 'Sonsonate', 37, 2019],
    [9, 'San Salvador', 16, 2023],
    [18, 'San Salvador', 38, 2018]
  ]);
});

test('los datos de las 20 consultas coinciden con la muestra', () => {
  const esperado = `1 La Unión 49 2023
2 Usulután 33 2022
3 Santa Ana 18 2018
4 San Salvador 51 2021
5 Sonsonate 13 2022
6 San Salvador 6 2023
7 Sonsonate 37 2019
8 La Libertad 19 2021
9 San Salvador 16 2023
10 Morazán 38 2021
11 La Libertad 40 2019
12 La Libertad 5 2019
13 La Libertad 17 2022
14 Morazán 48 2021
15 San Salvador 40 2018
16 La Paz 46 2023
17 La Paz 10 2019
18 San Salvador 38 2018
19 Cabañas 42 2018
20 Sonsonate 21 2022`.split('\n');
  assert.deepEqual(EPI.CONSULTAS.map((c) => `${c.n} ${c.departamento} ${c.se} ${c.anio}`), esperado);
});

test('versión desconocida lanza error', () => {
  assert.throws(() => EPI.generarMediciones('otra'));
});

// ---------- Horas y tiempos ----------

test('formatHora usa 24 h hh:mm:ss y trunca los milisegundos', () => {
  assert.equal(EPI.formatHora(t(10, 0, 0, 900)), '10:00:00');
  assert.equal(EPI.formatHora(t(10, 0, 5, 100)), '10:00:05');
  assert.equal(EPI.formatHora(t(9, 5, 3, 999)), '09:05:03');
  assert.equal(EPI.formatHora(t(0, 0, 0, 0)), '00:00:00');
  assert.equal(EPI.formatHora(t(23, 59, 59, 999)), '23:59:59');
  assert.equal(EPI.formatHora(t(15, 30, 0)), '15:30:00'); // 24 h, no 3:30 PM
  assert.equal(EPI.formatHora(null), '');
});

test('el tiempo es la diferencia de las horas truncadas: 10:00:00.900 a 10:00:05.100 son 5 s', () => {
  const ini = t(10, 0, 0, 900);
  const fin = t(10, 0, 5, 100);
  assert.equal(EPI.formatHora(ini), '10:00:00');
  assert.equal(EPI.formatHora(fin), '10:00:05');
  assert.equal(EPI.calcularSegundos(ini, fin), 5); // el redondeo real (4,2 s) daría 4
});

test('hora de fin menos hora de inicio siempre es igual al tiempo (ficha coherente)', () => {
  const aSeg = (h) => { const [a, b, c] = EPI.formatHora(h).split(':').map(Number); return a * 3600 + b * 60 + c; };
  for (const [msIni, msFin] of [[0, 0], [999, 1000], [900, 5100], [0, 999], [500, 59500], [999, 60000]]) {
    const ini = t(10, 14, 59, 0) + msIni;
    const fin = ini - msIni + msFin + 0;
    assert.equal(EPI.calcularSegundos(ini, fin), aSeg(fin) - aSeg(ini), `${msIni}->${msFin}`);
  }
  // Cruzando el cambio de minuto y de hora
  assert.equal(EPI.calcularSegundos(t(10, 59, 58, 700), t(11, 0, 3, 200)), 5);
});

test('formatContador da m:ss', () => {
  assert.equal(EPI.formatContador(0), '0:00');
  assert.equal(EPI.formatContador(59), '0:59');
  assert.equal(EPI.formatContador(60), '1:00');
  assert.equal(EPI.formatContador(245), '4:05');
  assert.equal(EPI.formatContador(300), '5:00');
});

test('nivelContador: normal, advertencia desde 240 s, límite desde 300 s', () => {
  assert.equal(EPI.nivelContador(0), 'normal');
  assert.equal(EPI.nivelContador(239), 'normal');
  assert.equal(EPI.nivelContador(240), 'advertencia');
  assert.equal(EPI.nivelContador(299), 'advertencia');
  assert.equal(EPI.nivelContador(300), 'limite');
});

test('fechaLocalISO usa la fecha local', () => {
  assert.equal(EPI.fechaLocalISO(t(23, 59, 59)), '2026-09-29');
  assert.equal(EPI.fechaLocalISO(new Date(2026, 0, 5, 0, 0, 1).getTime()), '2026-01-05');
});

// ---------- Corte a 300 s ----------

test('a los 300 s la medición se corta: fin = inicio + 300 s, tiempo 300, No encontrado', () => {
  const ini = t(10, 0, 0, 400);
  const m = { ...EPI.generarMediciones('externo')[0], inicioMs: ini };
  for (const ahora of [ini + 300000, ini + 300001, ini + 421000, ini + 3600000]) {
    const r = EPI.detenerMedicion(m, ahora);
    assert.equal(r.finMs, ini + 300000, 'ahora=+' + (ahora - ini));
    assert.equal(r.tiempoS, 300);
    assert.equal(r.noEncontrado, true);
    assert.equal(r.cortada, true);
    assert.equal(EPI.formatHora(r.finMs), '10:05:00'); // 10:00:00 + 300 s
  }
});

test('antes de 300 s la medición no se corta', () => {
  const ini = t(10, 0, 0, 0);
  assert.equal(EPI.limiteAlcanzado(ini, ini + 299999), false);
  assert.equal(EPI.limiteAlcanzado(ini, ini + 300000), true);
  const m = { ...EPI.generarMediciones('externo')[0], inicioMs: ini };
  const r = EPI.detenerMedicion(m, ini + 42000);
  assert.deepEqual([r.tiempoS, r.noEncontrado, r.cortada], [42, false, false]);
});

test('el corte automático detecta la medición en curso y no hace nada si no toca', () => {
  let e = EPI.crearSesion({ version: 'externo', operador: 'Ana', supervisor: 'Luis', fecha: '2026-09-29', lugar: '' }, t(9, 0, 0));
  assert.equal(EPI.accionAutoCorte(e, t(9, 10, 0)), e, 'sin medición en curso');
  const ini = t(10, 0, 0, 250);
  e = EPI.accionIniciar(e, ini);
  assert.equal(EPI.accionAutoCorte(e, ini + 299999), e, 'aún no llega');
  const c = EPI.accionAutoCorte(e, ini + 300050);
  const m = c.mediciones[0];
  assert.deepEqual([m.finMs, m.tiempoS, m.noEncontrado, m.cortada], [ini + 300000, 300, true, true]);
  assert.equal(c.undo, null, 'no se puede deshacer un corte por límite');
});

// ---------- CSV ----------

const CABECERA = 'version,operador,supervisor,fecha,lugar,n,departamento,se,anio,metodo,orden,hora_inicio,hora_fin,tiempo_s,no_encontrado,repeticiones,observaciones,inicio_epoch_ms,fin_epoch_ms';

// Parser CSV mínimo (RFC 4180) para comprobar la ida y vuelta.
function parsearCSV(texto) {
  const filas = []; let fila = []; let campo = ''; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\r' && texto[i + 1] === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; i++; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

function sesionConDatos() {
  let e = EPI.crearSesion({ version: 'externo', operador: 'María Núñez', supervisor: 'José Peña', fecha: '2026-09-29', lugar: 'Aula 3, Sede "Central"' }, t(9, 0, 0));
  e = EPI.accionIniciar(e, t(10, 0, 0, 900));
  e = EPI.accionDetener(e, t(10, 0, 5, 100));
  return e;
}

test('CSV: UTF-8 con BOM, encabezados exactos y separador coma', () => {
  const csv = EPI.generarCSV(sesionConDatos());
  assert.equal(csv.charCodeAt(0), 0xFEFF, 'BOM al inicio');
  assert.equal(csv.slice(1).split('\r\n')[0], CABECERA);
  assert.deepEqual(EPI.COLUMNAS_CSV, CABECERA.split(','));
  // Al codificar a UTF-8, el BOM son los bytes EF BB BF
  assert.deepEqual([...Buffer.from(csv, 'utf8').subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
});

test('CSV: una fila por medición (10 externa, 40 equipo) más el encabezado', () => {
  const ext = parsearCSV(EPI.generarCSV(sesionConDatos()).slice(1));
  assert.equal(ext.length, 11);
  assert.ok(ext.every((f) => f.length === 19));
  const eq = EPI.crearSesion({ version: 'equipo', operador: 'A', supervisor: 'B', fecha: '2026-09-29', lugar: '' }, t(9, 0, 0));
  assert.equal(parsearCSV(EPI.generarCSV(eq).slice(1)).length, 41);
});

test('CSV: valores de una medición hecha (horas truncadas, tiempo y epoch)', () => {
  const filas = parsearCSV(EPI.generarCSV(sesionConDatos()).slice(1));
  const f = Object.fromEntries(EPI.COLUMNAS_CSV.map((c, i) => [c, filas[1][i]]));
  assert.equal(f.version, 'externo');
  assert.equal(f.n, '2');
  assert.equal(f.metodo, E);
  assert.equal(f.orden, '1');
  assert.equal(f.hora_inicio, '10:00:00');
  assert.equal(f.hora_fin, '10:00:05');
  assert.equal(f.tiempo_s, '5');
  assert.equal(f.no_encontrado, '0');
  assert.equal(f.repeticiones, '0');
  assert.equal(f.inicio_epoch_ms, String(t(10, 0, 0, 900)));
  assert.equal(f.fin_epoch_ms, String(t(10, 0, 5, 100)));
  // Medición pendiente: celdas vacías
  const p = Object.fromEntries(EPI.COLUMNAS_CSV.map((c, i) => [c, filas[2][i]]));
  assert.deepEqual([p.hora_inicio, p.hora_fin, p.tiempo_s, p.no_encontrado, p.inicio_epoch_ms, p.fin_epoch_ms], ['', '', '', '', '', '']);
});

test('CSV: escapa comas, comillas y saltos de línea en observaciones', () => {
  assert.equal(EPI.escaparCSV('sin problema'), 'sin problema');
  assert.equal(EPI.escaparCSV('uno, dos'), '"uno, dos"');
  assert.equal(EPI.escaparCSV('dijo "listo"'), '"dijo ""listo"""');
  assert.equal(EPI.escaparCSV('línea 1\nlínea 2'), '"línea 1\nlínea 2"');
  assert.equal(EPI.escaparCSV(0), '0');
  assert.equal(EPI.escaparCSV(null), '');

  const obs = 'Buscó en "Boletín 33", luego en el índice, y dudó\nsegunda línea';
  let e = EPI.accionObservaciones(sesionConDatos(), obs);
  const filas = parsearCSV(EPI.generarCSV(e).slice(1));
  const i = EPI.COLUMNAS_CSV.indexOf('observaciones');
  assert.equal(filas[1][i], obs, 'ida y vuelta exacta');
  assert.equal(filas[1].length, 19, 'las comas internas no crean columnas nuevas');
  assert.equal(filas[1][EPI.COLUMNAS_CSV.indexOf('lugar')], 'Aula 3, Sede "Central"');
});

test('CSV: conserva los acentos y la ñ', () => {
  const csv = EPI.generarCSV(sesionConDatos());
  assert.ok(csv.includes('María Núñez'));
  assert.ok(csv.includes('Usulután'));
  assert.ok(csv.includes('Morazán') === false, 'la externa no incluye Morazán');
  const eq = EPI.crearSesion({ version: 'equipo', operador: 'Ñandú', supervisor: 'B', fecha: '2026-09-29', lugar: '' }, t(9, 0, 0));
  const csvEq = EPI.generarCSV(eq);
  for (const palabra of ['La Unión', 'Morazán', 'Cabañas', 'Ñandú']) assert.ok(csvEq.includes(palabra), palabra);
  // Round trip por bytes UTF-8
  assert.ok(Buffer.from(csvEq, 'utf8').toString('utf8').includes('Cabañas'));
});

test('CSV: las repeticiones se cuentan en su columna', () => {
  let e = sesionConDatos();
  e = EPI.accionRepetir(e, t(10, 1, 0));
  const filas = parsearCSV(EPI.generarCSV(e).slice(1));
  assert.equal(filas[1][EPI.COLUMNAS_CSV.indexOf('repeticiones')], '1');
  assert.equal(filas[1][EPI.COLUMNAS_CSV.indexOf('hora_inicio')], '', 'la medición repetida queda lista para medirse de nuevo');
});

test('nombre de archivo: cronometro_<version>_<fecha>_<operador>.ext', () => {
  const e = sesionConDatos();
  assert.equal(EPI.nombreArchivo(e, 'csv'), 'cronometro_externo_2026-09-29_Maria-Nunez.csv');
  assert.equal(EPI.nombreArchivo(e, 'json'), 'cronometro_externo_2026-09-29_Maria-Nunez.json');
  assert.equal(EPI.nombreArchivo({ ...e, operador: '  ' }, 'csv'), 'cronometro_externo_2026-09-29_sin-operador.csv');
  assert.equal(EPI.nombreArchivo({ ...e, operador: 'a/b\\c:d*e' }, 'csv'), 'cronometro_externo_2026-09-29_a-b-c-d-e.csv');
});

// ---------- Sesión, repeticiones y deshacer ----------

const datos = { version: 'externo', operador: ' Ana ', supervisor: 'Luis', fecha: '2026-09-29', lugar: ' Aula ' };

test('crearSesion normaliza los datos y guarda la hora de inicio de la sesión', () => {
  const e = EPI.crearSesion(datos, t(9, 0, 0, 500));
  assert.deepEqual([e.operador, e.lugar, e.sesionInicioMs, e.sesionFinMs, e.actual], ['Ana', 'Aula', t(9, 0, 0, 500), null, 0]);
  assert.ok(EPI.esEstadoValido(e));
});

test('validarDatosSesion exige versión, operador, supervisor y fecha', () => {
  assert.deepEqual(EPI.validarDatosSesion(datos), []);
  assert.equal(EPI.validarDatosSesion({ ...datos, version: '' }).length, 1);
  assert.equal(EPI.validarDatosSesion({ ...datos, operador: '   ' }).length, 1);
  assert.equal(EPI.validarDatosSesion({ ...datos, supervisor: '' }).length, 1);
  assert.equal(EPI.validarDatosSesion({ ...datos, fecha: '' }).length, 1);
  assert.equal(EPI.validarDatosSesion({ ...datos, lugar: '' }).length, 0, 'el lugar es opcional');
});

test('no se puede iniciar una medición que ya tiene datos, ni detener una que no corre', () => {
  let e = EPI.crearSesion(datos, t(9, 0, 0));
  assert.equal(EPI.accionDetener(e, t(9, 0, 1)), e, 'detener sin iniciar');
  e = EPI.accionIniciar(e, t(10, 0, 0));
  assert.equal(EPI.accionIniciar(e, t(10, 0, 1)), e, 'iniciar dos veces');
  e = EPI.accionDetener(e, t(10, 0, 4));
  assert.equal(EPI.accionIniciar(e, t(10, 0, 5)), e, 'iniciar una medición con datos');
  assert.equal(EPI.accionPrincipal(e.mediciones[0]), null);
  assert.equal(EPI.accionPrincipal(e.mediciones[1]), 'iniciar');
});

test('repetir archiva el intento anterior, cuenta la repetición y no borra nada', () => {
  let e = EPI.crearSesion(datos, t(9, 0, 0));
  e = EPI.accionIniciar(e, t(10, 0, 0, 900));
  e = EPI.accionDetener(e, t(10, 0, 7, 100));
  e = EPI.accionObservaciones(e, 'se equivocó de boletín');
  e = EPI.accionRepetir(e, t(10, 1, 0));
  assert.equal(e.mediciones[0].repeticiones, 1);
  assert.equal(e.mediciones[0].inicioMs, null);
  assert.equal(e.mediciones[0].observaciones, '');
  assert.equal(e.registro.length, 1);
  assert.deepEqual(
    [e.registro[0].n, e.registro[0].metodo, e.registro[0].intento, e.registro[0].tiempoS, e.registro[0].observaciones, e.registro[0].archivadoMs],
    [2, E, 1, 7, 'se equivocó de boletín', t(10, 1, 0)]
  );
  // segunda repetición (esta vez interrumpida en curso)
  e = EPI.accionIniciar(e, t(10, 2, 0));
  e = EPI.accionRepetir(e, t(10, 2, 30));
  assert.equal(e.mediciones[0].repeticiones, 2);
  assert.equal(e.registro.length, 2);
  assert.deepEqual([e.registro[1].intento, e.registro[1].interrumpida, e.registro[1].finMs], [2, true, null]);
  assert.equal(EPI.accionRepetir(e, t(10, 3, 0)), e, 'repetir una medición pendiente no hace nada');
});

test('deshacer un Detener por error devuelve la medición a "en curso" con su hora original', () => {
  let e = EPI.crearSesion(datos, t(9, 0, 0));
  e = EPI.accionIniciar(e, t(10, 0, 0, 900));
  e = EPI.accionDetener(e, t(10, 0, 3, 0));
  assert.equal(e.undo.descripcion, 'Detener');
  e = EPI.accionDeshacer(e);
  assert.equal(EPI.estadoMedicion(e.mediciones[0]), 'en_curso');
  assert.equal(e.mediciones[0].inicioMs, t(10, 0, 0, 900));
  assert.equal(e.mediciones[0].finMs, null);
  assert.equal(e.undo, null);
});

test('deshacer Iniciar, No encontrado y Repetir', () => {
  let e = EPI.crearSesion(datos, t(9, 0, 0));
  e = EPI.accionDeshacer(EPI.accionIniciar(e, t(10, 0, 0)));
  assert.equal(EPI.estadoMedicion(e.mediciones[0]), 'pendiente');

  e = EPI.accionDetener(EPI.accionIniciar(e, t(10, 0, 0)), t(10, 0, 9));
  const marcada = EPI.accionNoEncontrado(e);
  assert.equal(marcada.mediciones[0].noEncontrado, true);
  assert.equal(EPI.accionDeshacer(marcada).mediciones[0].noEncontrado, false);
  assert.equal(EPI.accionNoEncontrado(marcada).mediciones[0].noEncontrado, false, 'alterna');

  const rep = EPI.accionRepetir(e, t(10, 5, 0));
  const vuelta = EPI.accionDeshacer(rep);
  assert.equal(vuelta.registro.length, 0, 'el registro vuelve a su estado anterior');
  assert.deepEqual([vuelta.mediciones[0].repeticiones, vuelta.mediciones[0].tiempoS], [0, 9]);
});

test('deshacer no borra lo escrito en Observaciones después de la acción', () => {
  let e = EPI.accionDetener(EPI.accionIniciar(EPI.crearSesion(datos, t(9, 0, 0)), t(10, 0, 0)), t(10, 0, 9));
  e = EPI.accionNoEncontrado(e);
  e = EPI.accionObservaciones(e, 'no estaba en el índice');
  e = EPI.accionDeshacer(e);
  assert.equal(e.mediciones[0].noEncontrado, false);
  assert.equal(e.mediciones[0].observaciones, 'no estaba en el índice');
});

test('deshacer solo está disponible hasta pasar a otra medición', () => {
  let e = EPI.accionDetener(EPI.accionIniciar(EPI.crearSesion(datos, t(9, 0, 0)), t(10, 0, 0)), t(10, 0, 9));
  assert.ok(e.undo);
  e = EPI.accionIr(e, 1);
  assert.equal(e.actual, 1);
  assert.equal(e.undo, null);
  assert.equal(EPI.accionDeshacer(e), e);
});

test('ir a la medición actual (p. ej. desde el resumen) no descarta el Deshacer', () => {
  let e = EPI.accionDetener(EPI.accionIniciar(EPI.crearSesion(datos, t(9, 0, 0)), t(10, 0, 0)), t(10, 0, 9));
  assert.equal(EPI.accionIr(e, e.actual), e);
  assert.equal(EPI.accionIr(e, e.actual).undo.descripcion, 'Detener');
});

test('la marca manual de No encontrado no se puede quitar si fue corte por límite', () => {
  let e = EPI.accionIniciar(EPI.crearSesion(datos, t(9, 0, 0)), t(10, 0, 0));
  e = EPI.accionDetener(e, t(10, 6, 0)); // tarde: corta a 300 s
  assert.deepEqual([e.mediciones[0].cortada, e.mediciones[0].tiempoS, e.mediciones[0].noEncontrado], [true, 300, true]);
  assert.equal(EPI.accionNoEncontrado(e), e);
});

test('no se puede salir de una medición en curso ni iniciar otra', () => {
  let e = EPI.accionIniciar(EPI.crearSesion(datos, t(9, 0, 0)), t(10, 0, 0));
  assert.equal(EPI.accionIr(e, 1), e);
  assert.equal(EPI.accionIr(e, 0), e);
  assert.equal(EPI.accionFinalizar(e, t(10, 1, 0)), e);
});

test('hora de fin de sesión: se fija al finalizar y se reabre si hay más actividad', () => {
  let e = EPI.crearSesion(datos, t(9, 0, 0));
  e = EPI.accionFinalizar(e, t(11, 0, 0));
  assert.equal(e.sesionFinMs, t(11, 0, 0));
  e = EPI.accionIniciar(e, t(11, 5, 0));
  assert.equal(e.sesionFinMs, null);
});

test('esEstadoValido rechaza datos dañados', () => {
  const e = EPI.crearSesion(datos, t(9, 0, 0));
  assert.ok(EPI.esEstadoValido(JSON.parse(JSON.stringify(e))));
  assert.equal(EPI.esEstadoValido(null), false);
  assert.equal(EPI.esEstadoValido({}), false);
  assert.equal(EPI.esEstadoValido({ ...e, version: 'otra' }), false);
  assert.equal(EPI.esEstadoValido({ ...e, mediciones: e.mediciones.slice(1) }), false);
  assert.equal(EPI.esEstadoValido({ ...e, actual: 99 }), false);
  assert.equal(EPI.esEstadoValido({ ...e, esquema: 2 }), false);
});

test('las acciones no modifican el estado recibido', () => {
  const e = EPI.crearSesion(datos, t(9, 0, 0));
  const copia = JSON.stringify(e);
  EPI.accionIniciar(e, t(10, 0, 0));
  EPI.accionObservaciones(e, 'x');
  EPI.accionIr(e, 3);
  assert.equal(JSON.stringify(e), copia);
});

// ---------- JSON ----------

test('JSON: estado completo con registro de repeticiones y sin el estado interno de deshacer', () => {
  let e = sesionConDatos();
  e = EPI.accionRepetir(e, t(10, 1, 0));
  const json = JSON.parse(EPI.generarJSON(e, t(12, 0, 0)));
  assert.equal(json.version, 'externo');
  assert.equal(json.mediciones.length, 10);
  assert.equal(json.registro.length, 1);
  assert.deepEqual([json.registro[0].horaInicio, json.registro[0].horaFin, json.registro[0].tiempoS], ['10:00:00', '10:00:05', 5]);
  assert.equal(json.sesionHoraInicio, '09:00:00');
  assert.equal(json.sesionHoraFin, '');
  assert.equal(json.exportadoMs, t(12, 0, 0));
  assert.equal('undo' in json, false);
  assert.equal(json.operador, 'María Núñez');
});

// ---------- Recorrido completo de la sesión del evaluador externo ----------

test('recorrido completo del evaluador externo: 10 mediciones, con recarga a mitad de una', () => {
  const recargar = (e) => JSON.parse(JSON.stringify(e)); // lo que hace localStorage al recargar la página
  let e = EPI.crearSesion({ version: 'externo', operador: 'Rosa', supervisor: 'Mario', fecha: '2026-09-29', lugar: 'Sala 1' }, t(9, 0, 0));
  let reloj = t(10, 0, 0, 350);
  const esperado = [[2, E], [2, T], [4, E], [4, T], [7, T], [7, E], [9, T], [9, E], [18, E], [18, T]];

  for (let i = 0; i < 10; i++) {
    const m = e.mediciones[e.actual];
    assert.deepEqual([m.n, m.metodo], esperado[i], 'medición ' + (i + 1));
    e = EPI.accionIniciar(e, reloj);
    if (i === 4) { // recarga a mitad de la medición 5
      e = recargar(e);
      assert.ok(EPI.esEstadoValido(e));
      assert.equal(EPI.indiceEnCurso(e), 4);
      assert.equal(e.mediciones[4].inicioMs, reloj, 'conserva la hora de inicio original');
      assert.equal(EPI.segundosTranscurridos(e.mediciones[4].inicioMs, reloj + 12000), 12, 'sigue corriendo');
    }
    if (i === 6) { // esta se pasa del límite
      e = EPI.accionAutoCorte(e, reloj + 300100);
      assert.deepEqual([e.mediciones[6].tiempoS, e.mediciones[6].noEncontrado, e.mediciones[6].cortada], [300, true, true]);
      reloj += 300100;
    } else {
      const dur = 4200 + i * 1300;
      e = EPI.accionDetener(e, reloj + dur);
      reloj += dur;
    }
    if (i === 2) { // Detener por error: se deshace y la medición sigue corriendo
      e = EPI.accionDeshacer(e);
      assert.equal(EPI.estadoMedicion(e.mediciones[2]), 'en_curso');
      e = EPI.accionDetener(e, reloj + 1000);
      reloj += 1000;
    }
    if (i === 1) e = EPI.accionObservaciones(e, 'dudó, "revisó" dos veces');
    reloj += 2500;
    if (i < 9) e = EPI.accionIr(e, e.actual + 1);
  }

  const p = EPI.progreso(e);
  assert.deepEqual([p.completadas, p.total, p.enCurso], [10, 10, false]);
  for (const m of e.mediciones) {
    assert.equal(m.tiempoS, EPI.calcularSegundos(m.inicioMs, m.finMs), 'tiempo = fin - inicio (truncadas)');
    assert.ok(m.tiempoS <= 300);
  }
  e = EPI.accionFinalizar(e, reloj);
  const filas = parsearCSV(EPI.generarCSV(e).slice(1));
  assert.equal(filas.length, 11);
  assert.equal(filas[7][EPI.COLUMNAS_CSV.indexOf('no_encontrado')], '1');
  assert.equal(filas[2][EPI.COLUMNAS_CSV.indexOf('observaciones')], 'dudó, "revisó" dos veces');
  assert.ok(e.sesionFinMs > e.sesionInicioMs);
});
