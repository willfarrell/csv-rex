import { add, cycle, /* save, */ suite } from 'benny'
import parse from './parse.js' // 'csv-rex/parse'

const inputs = {}
const configs = []
const baseline = {
  columns: 10,
  rows: 1_000,
  quotes: false,
  newlineChar: '\r\n',
  delimiterChar: ',',
  header: false,
  commentPrefixValue: false
}
configs.push({ ...baseline })
// expected to be slower, compare against each other
configs.push({ ...baseline, columns: 100 }) // input has move columns
configs.push({ ...baseline, rows: 10_000 }) // input has more rows
// Options
configs.push({
  ...baseline,
  header: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
}) // pre-defined headers to make object
configs.push({ ...baseline, header: true }) // use header to make object
configs.push({ ...baseline, newlineChar: '\n' }) // shorter newline ** should be fastest
configs.push({ ...baseline, newlineChar: '' }) // detect newline
configs.push({ ...baseline, delimiterChar: '\t' }) // detect delimiter
configs.push({ ...baseline, delimiterChar: '' }) // detect delimiter
configs.push({ ...baseline, commentPrefixValue: '//' }) // detect comments
configs.push({ ...baseline, quotes: true }) // input has quoted fields

configs.push({ ...baseline, newlineChar: '\n', delimiterChar: '\t' }) // TSV
configs.push({ ...baseline })

const baselineDiff = (config) => {
  const diff = {}
  for (const key in config) {
    if (config[key] !== baseline[key]) {
      diff[key] = config[key]
    }
  }
  return diff
}

const testBatch = (configs) => {
  return configs.map((config) => {
    const { columns, rows, quotes, ...options } = config
    const delimiterChar = options.delimiterChar || baseline.delimiterChar
    const newlineChar = options.newlineChar || baseline.newlineChar
    const input = `${columns}x${rows} w/${
      quotes ? '' : 'o'
    } quotes and {newlineChar:${newlineChar},delimiterChar:${delimiterChar}}`
    if (!inputs[input]) {
      const wrapper = quotes ? '"' : ''
      const delimiter = quotes ? `"${delimiterChar}"` : `${delimiterChar}`
      let csv =
        wrapper +
        Array.from({ length: columns + 1 }, (_, x) => `__${x}__`).join(
          delimiter
        ) +
        wrapper +
        newlineChar
      for (let y = 0; y < rows; y++) {
        csv +=
          wrapper +
          Array.from({ length: columns + 1 }, (_, x) => `${x}x${y}`).join(
            delimiter
          ) +
          wrapper +
          newlineChar
      }
      inputs[input] = csv
    }
    return add(
      `parse(${JSON.stringify({ columns, rows, quotes })}, ${JSON.stringify(
        options
      )}) :: ${JSON.stringify(baselineDiff(config))}`,
      () => {
        parse(inputs[input], options)
      }
    )
  })
}

const parseSuite = suite(
  'parse',
  ...testBatch(configs),
  cycle()
  // save({file: 'parse.bench.csv', format: 'csv'})
)

export default () => parseSuite
