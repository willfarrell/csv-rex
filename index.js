// import {TextDecoder} from 'node:util'
// import {defaultOptions, optionDetectNewlineValue} from './options.js'
import csvParse from 'csv-rex/parse'
import csvFormat from 'csv-rex/format'

export const parse = csvParse
export const format = csvFormat

export default {
  parse: csvParse,
  format: csvFormat
}
