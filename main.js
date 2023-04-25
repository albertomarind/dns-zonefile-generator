import {Parser} from '@json2csv/plainjs';
import process from 'process';
import fs from 'fs';
import zonefile from 'dns-zonefile';
import path from 'path';

const NOMBRE_ARCHIVO_SALIDA = 'archivo-zonas.csv';

try {
  let directorio = process.argv[2];
  let archivos = fs.readdirSync(directorio, {withFileTypes: true});
  let archivosZonas = archivos.filter(archivo => path.extname(archivo.name) === '.txt')
  let parser = new Parser();
  let csv = '';
  let arregloFinal = archivosZonas.reduce((prev, actual) => {
    let jsonZonas = leerArchivo(actual.name);
    let arregloJsonMapeado = mapearJson(jsonZonas);
    return [...prev, ...arregloJsonMapeado]
  }, []);
  csv = parser.parse(arregloFinal);
  if (fs.existsSync('./' + NOMBRE_ARCHIVO_SALIDA)) {
    fs.unlinkSync('./' + NOMBRE_ARCHIVO_SALIDA);
  }
  fs.appendFileSync('./' + NOMBRE_ARCHIVO_SALIDA, csv);
} catch (err) {
  console.error(err);
}

function leerArchivo(ruta) {
  let contenidoArchivo = fs.readFileSync(ruta, 'utf8');
  return zonefile.parse(contenidoArchivo);
}

function mapearJson(jsonZonas) {
  let soa = jsonZonas['soa'];
  let origin = jsonZonas['$origin'];
  let arregloSalida = [];
  let primerRegistro = obtenerPrimerRegistro(soa, origin);
  arregloSalida.push(primerRegistro);
  Object.keys(jsonZonas).forEach((key) => {
    if (Array.isArray(jsonZonas[key])) {
      jsonZonas[key].forEach((registro) => {
        arregloSalida.push({
          nombre: registro.name === '@' ? origin : registro.name,
          zona: origin,
          tipo: key,
          ttl: registro.ttl,
          valor: obtenerValor(registro)
        })
      });
    }
  });
  return arregloSalida;
}

function obtenerPrimerRegistro(soa, origin) {
  return {
    nombre: soa.name === '@' ? origin : soa.name, zona: origin, tipo: 'soa', ttl: soa.ttl, valor: obtenerValor(soa)
  };
}

function obtenerValor(registro) {
  let cadenaValor = '';
  Object.keys(registro).forEach(key => {
    if (key !== 'name' && key !== 'ttl') {
      cadenaValor += `${key} ${registro[key]} `
    }
  });
  return cadenaValor;
}
