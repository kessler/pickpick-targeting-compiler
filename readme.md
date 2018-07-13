# pickpick-targeting-compiler

**compiles targeting expressions to javascript code for pickpick engine**

## example

`npm i pickpick-targeting-compiler`

```js
const assert = require('assert')
const compile = require('../index')

// intentionally using var here 

// all normal js operators apply
var { isMatch, features } = compile('_.geo === "US"')
assert(isMatch({ geo: 'US' }))

var { isMatch, features } = compile('_.number >= 0')
assert(isMatch({ number: 1 }))

// can create compound logical statements
var { isMatch, features } = compile('_.geo === "US" && _.number > 5')
assert(isMatch({ geo: 'US', number: 8 }))

// in operator - same as Array.includes(value)
var { isMatch, features } = compile('_.geo in ["US", "MX"]')
assert(isMatch({ geo: 'US' }))

// operators apply to context data as well
var { isMatch, features } = compile('_.geo in _.page')
assert(isMatch({ geo: 'US', page: ["US", "MX"] }))

// startsWith operator - same as String.startsWith(string)
var { isMatch, features } = compile('_.geo startsWith "x"')
assert(isMatch({ geo: 'xyz' }))

// endsWith operator - same as String.endsWith(string)
var { isMatch, features } = compile('_.geo endsWith "z"')
assert(isMatch({ geo: 'xyz' }))

// match operator for literal regular expressions, same as /regex/g.test('value')
var { isMatch, features } = compile('_.geo match "[0-9]"')
assert(isMatch({ geo: 0 }))

// exposes a bunch of isSomething from util:
// isNullOrUndefined,
// isNull,
// isUndefined,
// isString,
// isNumber,
// isArray,
// isObject,
// isBoolean,
// isDate,
// isNull,
// isPrimitive
var { isMatch, features } = compile('isNumber(_.geo)')
assert(isMatch({ geo: 0 }))

// provide user defined functions and data
const userEnvironment = { x: [1, 2, 3], isOk: (arg) => arg.startsWith('x') }
var { isMatch, features } = compile('_.geo in $.x && $.isOk(_.page)', { userEnvironment })
assert(isMatch({ geo: 1, page: 'x.html' }))
```

## api

## license

[MIT](http://opensource.org/licenses/MIT) © ironSource LTD
