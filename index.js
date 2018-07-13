const debug = require('debug')('pickpick-targeting-compiler')
const jsep = require('jsep')
const vm = require('vm')
const defaults = require('lodash.defaults')
const { isFunction } = require('util')
const {
	DEFAULT_BUILTIN_FUNCTIONS,
	DEFAULT_ENVIRONMENT,
	USER_ENV_NAMESPACE,
	INPUT_NAMESPACE
} = require('./defaults.js')

module.exports = compile

// special operators added to this parser
// the number 6 was decided based on the precendence given to
// '===' and other equality operators in jsep source code
jsep.addBinaryOp('in', 6)
jsep.addBinaryOp('match', 6)
jsep.addBinaryOp('startsWith', 6)
jsep.addBinaryOp('endsWith', 6)

const functionsWhitelist = generateFunctionsWhitelist()
debug('functions whitelist', functionsWhitelist)

function compile(expression, {
	matcherProperty = 'isMatch',
	userEnvironment = {},
	userEnvNamespace = USER_ENV_NAMESPACE,
	inputNamespace = INPUT_NAMESPACE
} = {}) {

	if (matcherProperty === 'features') {
		throw new TypeError('cannot use "features" as property name for matcher function')
	}

	const tree = jsep(expression)
	const features = new Set()

	const condition = compileNode(tree, features)
	debug('condition', condition)

	const sandbox = defaults({ _fn: false, $: userEnvironment }, DEFAULT_ENVIRONMENT)
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

		if (!node) {
			return
		}

		if (node.type === 'MemberExpression') {
			const member = `${compileNode(node.object)}.${node.property.name}`

			if (member.startsWith(inputNamespace)) {
				features.add(node.property.name)
			}

			return member
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
			return `${node.name}`
		}

		if (node.type === 'Literal') {
			return JSON.stringify(node.value)
		}

		if (node.type === 'ArrayExpression') {
			return JSON.stringify(node.elements.map(toValueArray))
		}

		return `${compileNode(node.left)} ${node.operator} ${compileNode(node.right)}`
	}

	function handleCallExpression(node) {
		// if (node.callee.type === 'Identifier') {
		// 	let functionName = node.callee.name
		// 	if (functionsWhitelist.includes(functionName)) {
		// 		return `${functionName}(${node.arguments.map(compileNode).join(', ')})`
		// 	}

		// 	throw new TypeError(`unsupported function ${functionName}`)
		// }

		const functionName = compileNode(node.callee)
		if (functionsWhitelist.includes(functionName) || functionName.startsWith('$')) {
			return `${functionName}(${node.arguments.map(compileNode).join(', ')})`
		}

		throw new TypeError(`unsupported function ${functionName}`)
	}


	function createVMCode(condition) {
		return `_fn = (${inputNamespace}) => {
	return Boolean(${condition})
}`
	}
}

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

function generateFunctionsWhitelist() {
	let result = []
	for (let key in DEFAULT_ENVIRONMENT) {
		if (isFunction(DEFAULT_ENVIRONMENT[key])) {
			result.push(key)
		}
	}

	return result.concat(DEFAULT_BUILTIN_FUNCTIONS)
}