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
jsep.addBinaryOp('deeplyEquals', 6)

const functionsWhitelist = generateFunctionsWhitelist()
debug('functions whitelist', functionsWhitelist)

/**
 *    Compile an expression into a resuable javascript function
 *    
 *    @param  {String} expression - any expression that can be parsed by [jsep](https://github.com/soney/jsep)
 *    @param  {Object} options
 *    @param  {String} options.matcherProperty - return the match function using a different property name in the compound return value, e.g: 
 *
 *    @example
 *	 // options.matcherProperty
 *	 
 *    // normally this would be isMatch instead of 'foo'
 *    let { foo } = compile('_.geo === "1"', { matcherProperty: 'foo' })
 *      
 *    @param  {Object} options.userEnvironment - allows the user to inject additional functionality that will be exposed to the expression. e.g:
 *    
 *    @example
 *    // options.userEnvironment
 *    
 *    let userEnvironment = {
 *  	    geos: ['MX', 'US', 'IL'],
 *   	    format: value => value.toUpperCase()
 *    }
 *    
 *    let { isMatch } = compile('$.format(_.geo) in $.geos', { userEnvironment })
 *    
 *    @param  {String} [options.userEnvNamespace=$] - change the name used to access user environment in an expression
 *    @param  {String} [options.inputNamespace=_] - change the name used to access input in the expression
 *    
 *    @return {Function} a function that accepts input and returns a boolean value
 */
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

		if (node.operator === 'deeplyEquals') {
			return `deeplyEquals(${compileNode(node.left)}, ${compileNode(node.right)})`
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

function generateFunctionsWhitelist() {
	let result = []
	for (let key in DEFAULT_ENVIRONMENT) {
		if (isFunction(DEFAULT_ENVIRONMENT[key])) {
			result.push(key)
		}
	}

	return result.concat(DEFAULT_BUILTIN_FUNCTIONS)
}