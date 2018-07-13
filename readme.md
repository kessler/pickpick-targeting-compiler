# pickpick-targeting-compiler

**compiles targeting expressions for pickpick engine**

## example

`npm i pickpick-targeting-compiler`

```js
const assert = require('assert')
const compile = require('../index')

// intentionally using var here 

// all normal js operators apply
var { isMatch, features } = compile('geo === "US"')
assert(isMatch({ geo: 'US' }))

var { isMatch, features } = compile('number >= 0')
assert(isMatch({ number: 1 }))

// can create compound logical statements
var { isMatch, features } = compile('geo === "US" && number > 5')
assert(isMatch({ geo: 'US', number: 8 }))

// in operator - same as Array.includes(value)
var { isMatch, features } = compile('geo in ["US", "MX"]')
assert(isMatch({ geo: 'US' }))

// match operator for literal regular expressions, same as /regex/g.test('value')
var { isMatch, features } = compile('geo match "[0-9]"')
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
var { isMatch, features } = compile('isNumber(geo)')
assert(isMatch({ geo: 0 }))
```

## api

## license

[MIT](http://opensource.org/licenses/MIT) © ironSource LTD
