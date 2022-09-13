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
- Small bundle size (~1KB compressed = esbuild + minify + br)
- Zero dependencies
- ESM & CJS modules with `.map` files
- NodeJS and WebStream API support via [@datastream/csv](https://github.com/willfarrell/datastream)
- It's just fast. See the [benchmarks](https://github.com/willfarrell/csv-benchmarks).

## Why not use `papaparse` or `csv-parse`?

Both are great libraries, we've used them both in many projects over the years.

- [`csv-parse`](https://csv.js.org/parse/): Built on top of NodeJS native APIs giving it great stream support. If you want to run it in the browser however, you've going to have to ship a very large polyfill.
- [`papaparse`](https://www.papaparse.com/): Built to be more friendly for browser with an option to run in node as well. Faster than `csv-parse`, but, it's dadbod and lack of native stream support leaves room for improvement.

The goal with `csv-rex` is to have a CSV parser and formatter that is as fast as others, reduced bundle size, and have cross-environment stream support. We think we've achieved our goal and hope you enjoy.

## Setup

```bash
npm install csv-rex
```

```javascript
import { parse, format } from 'csv-rex'

// parse
const linesArray = parse(inputString, {})

// format
const csv = format(linesArray, {})
```
