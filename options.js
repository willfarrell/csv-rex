export const defaultOptions = {
  // source
  chunkSize: 10 * 1024 * 1024, // 5MB for fetch
  encoding: 'utf-8',

  // progress
  onProgress: false, // () => {} TODO tests
  progressIntervalInMs: 100,

  // csvParse
  fastMode: true,
  header: true, // false: return array; true: detect headers and return json; [...]: use defined headers and return json
  newlineValue: '\n', // undefined: detect newline from file; '\r\n': Windows; '\n': Linux/Mac
  delimiterValue: ',', // TODO add in auto detect or function
  quoteChar: '"',
  escapeChar: '"',
  commentPrefixValue: false, // false: disable
  emptyFieldValue: '', // undefined: do not attach parameter; null: same as default
  coerceField: (field) => field, // TODO tests
  errorOnEmptyLine: false, // TODO tests
  errorOnComment: false, // TODO tests
  errorOnFieldMalformed: false, // TODO new code + tests
  errorOnFieldsMismatch: false, // TODO tests

  onRowParse: () => {},
}

//export const recordSeparator = String.fromCharCode(30)
//export const unitSeparator = String.fromCharCode(31)
  
export const peekahead = async (blob, opts) => {
  const {chunkSize, encoding} = { ...defaultOptions, ...opts }

  const chunk = blob.slice(0, chunkSize)
  const buffer = await chunk.arrayBuffer() 
  
  const textDecoder = new TextDecoder(encoding)
  const text = textDecoder.decode(buffer)
}

export const detectOptions = (chunkText, opts) => {
  const newlineValue = detectNewlineValue(chunkText, opts)
  const delimiterValue = detectDelimiterValue(chunkText, opts)
  return {newlineValue, delimiterValue}
}

export const detectNewlineValue = async (chunkText, opts) => {
  const r = chunkText.indexOf('\r')
  return (r < 0) ? '\n' : '\r\n'
}

export const detectDelimiterValue = async (chunkText, opts) => {
  // TODO if requested
  return ','
}

export default defaultOptions