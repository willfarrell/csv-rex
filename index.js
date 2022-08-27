// import {TextDecoder} from 'node:util'
// import {defaultOptions, optionDetectNewlineValue} from './options.js'
import csvParse from 'csv-rex/parse'
import csvParseMini from 'csv-rex/parse-mini'
import csvFormat from 'csv-rex/format'

export const parse = csvParse
export const parseMini = csvParseMini
export const format = csvFormat

export default {
  parse: csvParse,
  parseMini: csvParseMini,
  format: csvFormat
}
