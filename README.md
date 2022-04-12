<svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg"><text x="312" y="152" font-size="16px">🦖</text></svg>
<div align="center">
<h1>CSV-Rex</h1>
<p>Don't let it's small hands fool you ...</p>
<p>A tiny and fast CSV parser for JavaScript.</p>
</div>


## Features
- [RFC-4180](https://tools.ietf.org/html/rfc4180) Compliant
- ESM & Tree shaking
- Zero dependencies


## Why not use `papaparse` or `csv-parse`?
Both are great libraries, we've use them both in many projects. 

- [`csv-parse`](https://csv.js.org/parse/): Built on to of NodeJS native APIs giving it great stream support. If you wan to run it in the browser however, you've going to have to ship a very large polyfill.
- [`papaparse`](https://www.papaparse.com/): Built to be more friendly for browser with an option to run in node as well. Faster than `csv-parse`, but, it's dadbod and lack of stream support leaves room for improvement.

The goal with `csv-rex` was to have a csv parser that is as fast as others, reduce bundle size, and have full stream support. We think we've achieved our goal with up to **30% faster** benchmarks, **<1KB** compressed bundle, with an options for manual chunking, Web Stream API, and `node:stream`.


## Setup

```bash
npm install csv-rex
```


```javascript
import parse from 'csv-rex'

const options = {
  onRow = ({data, idx, err) => {
  	// ...
  }
}

await parseStream(input, options)
```

## Options
### Source
- `source` (`file`): `input` type.
  - `file`: `input` is a blob or file from a form
  - `string`: `input` is a string containing the CSV contents
  - `fetch`: `input` is a URL to a CSV
- `chunkSize` (`10MB`): Size of chunks to process at once. Should be greater than the size of the 3 largest lines.
- encoding (`utf-8`): `input` charset encoding

### Progress
- `progressIntervalInMs` (`100`): The minimum interval between progress updates. Triggered before every chunk.
- `onProgress` (`({percent, positionInBytes, totalInBytes}) => {}`): Function to run when eligible to notify.

### CSV Parse
- `fastMode` (`true`): Option to allow a faster parsing strategy when `quoteChar` is not present in a chunk.
- `header` (`true`): Keys to be used in JSON object for the parsed row
  - `true`: First row of the `input` is the headers and will need to be pulled out
  - `[...]`: Pre-assign headers because `input` contains no headers.
  - `false`: Don't map to JSON, return array of values instead.
- `newlineValue` (`undefined`): What `newline` characters to be used
  - `undefined`: Will auto-detect using the first chunk.
  - `\n`: Most common value to be used in CSV
  - `\r\n`: Common in Windows generated CSV files
- `commentPrefixValue` (`#`): Lines starting with this value will be ignored. Can be set to `false` if files will never have comments.
- `delimiterChar` (`,`): Character used to separate fields
- `quoteChar` (`"`): Character used to wrap fields that need to have special characters within them
- `escapeChar` (`"`): Character used to escape the `quoteChar`.
- `emptyFieldValue` (``): Value to be used instead of an empty string. Can be set to `undefined` to have empty fields not be included.
- `onRowParse` (`({data, idx, err}) => {}`): Function to run on parsed row data.

### TODO
- `coerceField` (`(field) => {}`): Function to apply type/value coercion.
- `coerceRow` (`(row) => {}`): Function to apply type/value coercion to a row.
- `errorOnEmptyLine` (`false`): When an empty line is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnComment` (`false`): When a comment is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldMalformed` (`false`): When no closing `quoteChar` is found. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldsMismatch` (`false`): When number of headers does not match the number of fields in a row. Push row with error when occurs, row ignored otherwise.

## Examples
### WebWorker
To prevent blocking of the main thread it is recommended that csv parsing is done in a WebWorker, SharedWebWorker, or ServiceWorker.

#### Simple
```javascript


```

#### Advanced
```javascript


```



### NodeJS

## Benchmarks

