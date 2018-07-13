const debug = require('debug')('pickpick-targeting-compiler')
const jsep = require('jsep')
const vm = require('vm')
const defaults = require('lodash.defaults')
const {
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

module.exports = compile

// special operators added to this parser
// the number 6 was decided based on the precendence given to
// '===' and other equality operators in jsep source code
jsep.addBinaryOp('in', 6)
jsep.addBinaryOp('match', 6)
jsep.addBinaryOp('startsWith', 6)
jsep.addBinaryOp('endsWith', 6)

const defaultEnvironment = {
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

function compile(expression, { matcherProperty = 'isMatch', userEnvironment = {} } = {}) {
	if (matcherProperty === 'features') {
		throw new TypeError('cannot use "features" as property name for matcher function')
	}

	const tree = jsep(expression)
	const features = new Set()

	const condition = compileNode(tree, features)
	debug('condition', condition)

	const sandbox = defaults({ _fn: false, user: userEnvironment }, defaultEnvironment)
	debug('sandbox', sandbox)

	vm.createContext(sandbox)

	const vmCode = createVMCode(condition)
	debug('vmCode', vmCode)

	vm.runInContext(vmCode, sandbox)

	return {
		[matcherProperty]: sandbox._fn,
		features
	}

	function compileNode(node) {

		debug('node', node)

		if (node.type === 'MemberExpression') {
			return `${node.object.name}.${node.property.name}`
		}

		if (node.type === 'CallExpression') {
			return handleCallExpression(node)
		}

		if (node.operator === 'in') {
			return `${compileNode(node.right)}.includes(${compileNode(node.left)})`
		}

		if (node.operator === 'match') {
			return `/${node.right.value}/g.test(${compileNode(node.left)})`
		}

		if (node.operator === 'startsWith') {
			return `${compileNode(node.left)}.startsWith(${compileNode(node.right)})`
		}

		if (node.operator === 'endsWith') {
			return `${compileNode(node.left)}.endsWith(${compileNode(node.right)})`
		}

		if (node.type === 'Identifier') {
			features.add(node.name)
			return `options.${node.name}`
		}

		if (node.type === 'Literal') {
			return JSON.stringify(node.value)
		}

		if (node.type === 'ArrayExpression') {
			return JSON.stringify(node.elements.map(toValueArray))
		}

		return `${compileNode(node.left)} ${node.operator} ${compileNode(node.right)}`
	}

	function handleCallExpression(node, context = { name: '' }) {
		if (node.callee.type === 'Identifier') {
			let functionName = node.callee.name
			if (inlineFunctionNames.includes(functionName)) {
				return inlineFunctions[functionName](node)
			}

			// if (!context.name.startsWith('user.')) {
			// 	throw new TypeError(`unsupported function ${functionName}`)
			// }

			return `${functionName}(${node.arguments.map(compileNode).join(', ')})`
		}

		console.log(node)
		let next = compileNode(node.callee)
		context.name += next
		console.log(context)
		handleCallExpression(next, context)
	}
}

const inlineFunctions = {
	// isNaN: (node) => {
	// 	ensureArgumentsLength('isNaN', node.arguments, 1)

	// 	let arg = node.arguments[0]

	// 	ensureNodeType('isNaN', 1, arg, 'Identifier')

	// 	let argCode = `options.${arg.name}`
	// 	return `isNaN(${argCode})`
	// },

	isDefined: (node) => {
		ensureArgumentsLength('isDefined', node.arguments, 1)

		let arg = node.arguments[0]

		ensureNodeType('isDefined', 1, arg, 'Identifier')

		let argCode = `options.${arg.name}`
		return `${argCode} !== undefined && ${argCode} !== null`
	}
}

const inlineFunctionNames = Object.keys(inlineFunctions)

function toValueArray(element) {
	return element.value
}

function toNameArray(element) {
	return element.name
}

function ensureArgumentsLength(fnName, args, length) {
	if (args.length !== length) {
		throw new TypeError(`${fnName}() accepts exactly ${length} argument(s)`)
	}
}

function ensureNodeType(fnName, position, node, type) {
	if (node.type !== type) {
		throw new TypeError(`${fnName}() requires an argument of type "${type}" at position ${position}`)
	}
}

function createVMCode(condition) {
	return `_fn = (options) => {
		return ${condition}
}`
}