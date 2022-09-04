# parse

## Options

- `header` (`true`): Keys to be used in JSON object for the parsed row
  - `true`: First row of the `input` is the headers and will need to be pulled out
  - `[...]`: Pre-assign headers because `input` contains no headers.
  - `false`: Don't map to JSON, return array of values instead.
- `newlineChar` (`''`): What `newline` character(s) to be used. By default will guess from `\r\n`, `\n`, `\r`
- `delimiterChar` (`''`): Characters used to separate fields. Must be length of 1. By default will guess from `,`, `\t`, `|`, `;`, `\x1E`, `\x1F`
- `quoteChar` (`"`): Character used to wrap fields that need to have special characters within them. Must be length of 1
- `escapeChar` (`${quoteChar}`): Character used to escape the `quoteChar`. Must be length of 1
- `enqueue` (`({data, idx, err}) => {}`): Function to run on parsed row data.
- `emptyFieldValue` (`''`): Value to be used instead of an empty string. Can be set to `undefined` to have empty fields not be included.
- `coerceField` (`(field, idx) => field`): Function to apply type/value coercion.
- `commentPrefixValue` (`false`): Lines starting with this value will be ignored (i.e. `#`, `//`). Can be set to `false` if files will never have comments.
- `errorOnEmptyLine` (`true`): When an empty line is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnComment` (`true`): When a comment is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldsMismatch` (`true`): When number of headers does not match the number of fields in a row. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldMalformed` (`true`): When no closing `quoteChar` is found. Throws parsing error.
- `chunkSize` (`64MB`): Size of chunks to process at once.
- `enableReturn` (`true`): Will concat rows into a single array. Set to `false` if handing data within enqueue for performance improvements.

## Examples

### Parsing a CSV formatted string to JSON (`[{...},{...},...]`)

```javascript
import { parse } from 'csv-rex'

const enqueue = ({ idx, data, err }) => {
  if (err) {
    // handler err
    return
  }
  // modify and/or handle data
}

export default (csvString) => parse(csvString, { enqueue })
```

### NodeJS Stream

```javascript
import { createReadStream } from 'node:fs'
import { pipeline } from '@datastream/core'
import { csvParseStream } from '@datastream/csv'

export default async (filePath, opts = {}) => {
  const streams = [
    createReadStream(filePath),
    csvParseStream()
    // ...
  ]

  const result = await pipeline(streams)
  console.log(result.csvErrors)
}
```

### Web Stream API

Requires: Chrome v71 , Edge v79, Firefox v102, Safari v14.5, NodeJS v18 (v16 with import). If you want to use WebStreams with node you need to pass `--conditions=webstream` in the cli to force its use.

```javascript
import { pipeline } from '@datastream/core'
import { stringReadableStream } from '@datastream/string'
import { csvParseStream } from '@datastream/csv'

export default async (blob, opts = {}) => {
  const streams = [
    stringReadableStream(blob),
    csvParseStream()
    // ...
  ]

  const result = await pipeline(streams)
  console.log(result.csvErrors)
}
```

### File from input form in a Browser

To prevent blocking the main thread it is recommended that CSV parsing is done in a WebWorker, SharedWorker, or ServiceWorker instead of the main thread.

```javascript
/* eslint-env worker */
import parse from 'csv-rex/parse'

const enqueue = ({ data, idx, err }) => {
  if (err) {
    // handler err
    return
  }
  // handle data
}

onmessage = async (event) => {
  const { file } = event.data
  const options = { enqueue }
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

```html
<html>
  <body>
    <form
      id="csv-demo"
      onsubmit="start('csv-demo');return false"
      enctype="multipart/form-data"
    >
      <input id="file" type="file" accept=".csv" onchange="start('csv-demo')" />
    </form>
    <script>
      const start = (id) => {
        const formData = document.getElementById(id)
        const data = {}
        for (let i = formData.length; i--; ) {
          if (formData[i].type === 'file') {
            if (!formData[i].files.length) {
              continue
            }
            data['file'] = formData[i].files[0]
          }
        }

        const worker = new Worker(`/js/worker/csv.js`)
        worker.onmessage = function (oEvent) {
          console.log(postMessageDecode(oEvent.data))
        }
        worker.onerror = function (e) {
          console.error('Worker error', e)
          throw e
        }
        worker.postMessage(data)
      }
    </script>
  </body>
</html>
```
