<div align="center">
<br/><br/><br/><br/><br/><br/><br/>
🦖
<br/><br/><br/><br/><br/><br/><br/>
<h1>CSV-Rex</h1>
<p>A tiny and fast CSV parser & formatter for JavaScript.</p>
<br />
<p>
  <a href="https://www.npmjs.com/package/csv-rex?activeTab=versions">
    <img src="https://badge.fury.io/js/csv-rex.svg" alt="npm version" style="max-width:100%;">
  </a>
  <a href="https://packagephobia.com/result?p=csv-rex">
    <img src="https://packagephobia.com/badge?p=csv-rex" alt="npm install size" style="max-width:100%;">
  </a>
  <a href="https://github.com/willfarrell/csv-rex/actions/workflows/tests.yml">
    <img src="https://github.com/willfarrell/csv-rex/actions/workflows/tests.yml/badge.svg?branch=main&event=push" alt="GitHub Actions CI status badge" style="max-width:100%;">
  </a>
  <br/>
   <a href="https://standardjs.com/">
    <img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="Standard Code Style"  style="max-width:100%;">
  </a>
  <a href="https://snyk.io/test/github/willfarrell/csv-rex">
    <img src="https://snyk.io/test/github/willfarrell/csv-rex/badge.svg" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/willfarrell/csv-rex" style="max-width:100%;">
  </a>
  <a href="https://github.com/willfarrell/csv-rex/actions/workflows/sast.yml">
    <img src="https://github.com/willfarrell/csv-rex/actions/workflows/sast.yml/badge.svg?branch=main&event=push" alt="SAST" style="max-width:100%;">
  </a>
  <a href="https://bestpractices.coreinfrastructure.org/projects/6208">
    <img src="https://bestpractices.coreinfrastructure.org/projects/6208/badge" alt="Core Infrastructure Initiative (CII) Best Practices"  style="max-width:100%;">
  </a>
</p>
</div>


## Features
- Free to use under MIT licence
- Comma-Separated Values (CSV) Files specification compliant ([RFC-4180](https://tools.ietf.org/html/rfc4180))
- Small bundle size (~1KB compressed)
- Zero dependencies
- ESM & CJS modules with `.map` files
- NodeJS and WebStream API support via @datastream/csv
- Tested up to 10M rows


## Why not use `papaparse` or `csv-parse`?
Both are great libraries, we've use them both in many projects over the years. 

- [`csv-parse`](https://csv.js.org/parse/): Built on top of NodeJS native APIs giving it great stream support. If you want to run it in the browser however, you've going to have to ship a very large polyfill.
- [`papaparse`](https://www.papaparse.com/): Built to be more friendly for browser with an option to run in node as well. Faster than `csv-parse`, but, it's dadbod and lack of native stream support leaves room for improvement.

The goal with `csv-rex` was to have a csv parser that is as fast as others, reduce bundle size, and have cross-environment stream support. We think we've achieved our goal and hope you enjoy.

## Setup

```bash
npm install csv-rex
```


```javascript
import {parse, format} from 'csv-rex'

const linesArray = parse(inputString, {})

const csv = format(linesArray, {})
```

## Options

### Common
- `newlineChar` (`\r\n`): What `newline` character(s) to be used.
- `delimiterChar` (`,`): Characters used to separate fields. Must be length of 1
- `quoteChar` (`"`): Character used to wrap fields that need to have special characters within them. Must be length of 1
- `escapeChar` (`${quoteChar}`): Character used to escape the `quoteChar`. Must be length of 1

### Parse
- `header` (`true`): Keys to be used in JSON object for the parsed row
  - `true`: First row of the `input` is the headers and will need to be pulled out
  - `[...]`: Pre-assign headers because `input` contains no headers.
  - `false`: Don't map to JSON, return array of values instead.
- `enqueue` (`({data, idx, err}) => {}`): Function to run on parsed row data.
- `emptyFieldValue` (``): Value to be used instead of an empty string. Can be set to `undefined` to have empty fields not be included.
- `coerceField` (`(field) => field`): Function to apply type/value coercion.
- `commentPrefixValue` (false): Lines starting with this value will be ignored (i.e. `#`, `//`). Can be set to `false` if files will never have comments.
- `errorOnEmptyLine` (`true`): When an empty line is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnComment` (`true`): When a comment is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldsMismatch` (`true`): When number of headers does not match the number of fields in a row. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldMalformed` (`true`): When no closing `quoteChar` is found. Throws parsing error.
- `chunkSize` (`64MB`): Size of chunks to process at once.
- `enableReturn` (`true`): Will concat rows into a single array. Set to `false` if handing data within enqueue for performance inprovements.

### Format
- `header` (`true`): Keys to be used in JSON object for the parsed row
  - `true`: Will create header from `Object.keys()`
  - `[...]`: Pre-assign headers to be included from object.
  - `false`: will not include a header line. Will use `Object.values()` for rows
- `quoteColumn`: (`undefined`): Array that maps to the headers to indicate what columns need to have quotes. Used to improve performance.
  - `true`: Always quote column
  - `false`: Never quote column
  - `undefined`/`null`/``: Detect if quotes are needed based on contents 
- `enqueue` (`(string) => {}`): Function to run on formatted row data.
- `enableReturn` (`true`): Will concat rows into a single string. Set to `false` if handing data within enqueue for performance inprovements.


## Examples
### Parsing a CSV formatted string to JSON (`[{...},{...},...]`)
```javascript
import { parse } from 'csv-rex'

const enqueue = ({data, idx, err}) => {
  if (err) {
    // handler err
    return
  }
  // modify or handle data
}

export default (csvString) => parse(csvString, { enqueue })
```

## WebWorker using a file
To prevent blocking of the main thread it is recommended that csv parsing is done in a WebWorker, SharedWebWorker, or ServiceWorker instead of the main thread.

```javascript
/* eslint-env worker */
import parse from 'csv-rex/parse'

const enqueue = ({data, idx, err}) => {
  if (err) {
    // handler err
    return
  }
  // handle data
}

onmessage = async (event) => {
  const { file } = event.data
  const options = {enqueue}
  file.length = file.size // polyfill length
  await parse(file, options)
  // ...
  postMessageEncode()
}

const postMessageEncode = (str) => {
  if (typeof str !== 'string') str = JSON.stringify(str)
  const buffer = new TextEncoder().encode(str).buffer
  postMessage(buffer, [buffer])
}
```


### Web Stream API
Requires: Chrome v71 , Edge v79, Firefox ([not supported yet](https://bugzilla.mozilla.org/show_bug.cgi?id=1493537)), Safari v14.5, NodeJS v18 (v16 with import)

```javascript
import parse from 'csv-rex/parse'

export default async (blob, opts = {}) => {
  const textDecodeStream = new TextDecoderStream(opts.encoding)
  const writeStream = new WritableStream({
    async write ({data, idx, err}) {
      if (err) {
        // handler err
        return
      }   
      // handle data
    }
  })
  
  return blob.stream()
    .pipeThrough(textDecodeStream)
    .pipeThrough(csvParseStream(opts))
    .pipeTo(writeStream)
    
}

export const csvParseStream = (opts) => {
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parse(opts)

  return new TransformStream({
    transform (chunk, controller) {
      chunk = previousChunk() + chunk

      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    },
    flush (controller) {
      const chunk = previousChunk()
      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
      controller.terminate()
    }
  })
}

```


### NodeJS Stream
```javascript
import { createReadStream } from 'node:fs'
import { Transform, Writable } from 'node:stream'
import parse from 'csv-rex/parse'

export default async (filePath, opts = {}) => {
  const readStream = createReadStream(filePath)
  const rows
  const writeStream = new Writable({
    async write ({data, idx, err}) {
      if (err) {
        // handler err
        return
      }   
      // handle data
      rows.push(data)
    }
  })
  
  await readStream
    //.pipe(textDecodeStream) // TODO
    .pipe(csvParseStream(opts))
    .pipe(writeStream)
  return rows
    
}

export const csvParseStream = (opts) => {
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parse(opts)

  return new Transform({
    decodeStrings: false,
    readableObjectMode: true,
    transform (chunk, encoding, callback) {
      const enqueue = (data) => this.push(data)
      chunk = previousChunk() + chunk

      if (canUseFastMode(chunk)) {
        fastParse(chunk, {enqueue})
      } else {
        slowParse(chunk, {enqueue})
      }
      callback()
    },
    flush (callback) {
      const enqueue = (data) => this.push(data)
      const chunk = previousChunk()
      if (canUseFastMode(chunk)) {
        fastParse(chunk, {enqueue})
      } else {
        slowParse(chunk, {enqueue})
      }
      callback()
    }
  })
}

```

## Roadmap
- [ ] Improve documentation
- [ ] Publish `@datastream/csv` and update examples
- [ ] Automate and publish benchmarks
- [ ] option functionality
  - validate options
  - autodetect options (newline/delimiter)
