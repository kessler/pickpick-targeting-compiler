const {
	isFunction,
	isNullOrUndefined,
	isNull,
	isUndefined,
	isString,
	isNumber,
	isArray,
	isObject,
	isBoolean,
	isDate,
	isPrimitive
} = require('util')

const DEFAULT_BUILTIN_FUNCTIONS = [
	'isNaN',
	'encodeURI',
	'decodeURI',
	'encodeURIComponent',
	'decodeURIComponent',
	'isFinite',
	'parseFloat',
	'parseInt',
	'escape',
	'unescape'
]

const DEFAULT_ENVIRONMENT = {
	isNullOrUndefined,
	isNull,
	isUndefined,
	isString,
	isNumber,
	isArray,
	isObject,
	isBoolean,
	isDate,
	isPrimitive
}

// define a special namespace for accessing user environment from within the expression
const USER_ENV_NAMESPACE = '$'

// define a special namespace for accessing input of the matcher function
const INPUT_NAMESPACE = '_'

module.exports = {
	DEFAULT_ENVIRONMENT,
	DEFAULT_BUILTIN_FUNCTIONS,
	USER_ENV_NAMESPACE,
	INPUT_NAMESPACE
}
