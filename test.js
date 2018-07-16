const { expect } = require('chai')
const compile = require('./index')
const { DEFAULT_BUILTIN_FUNCTIONS, DEFAULT_ENVIRONMENT } = require('./defaults.js')
const { isFunction, isUndefined } = require('util')

describe('compile', () => {
	describe('an expression to a matcher javascript function', () => {
		it('simple "===" expression', () => {
			let { isMatch } = compile('_.geo === "x"')
			expect(isMatch({ geo: 'x' })).to.be.true
			expect(isMatch({ geo: 'y' })).to.be.false
		})

		it('simple "!==" expression', () => {
			let { isMatch } = compile('_.geo !== "x"')
			expect(isMatch({ geo: 'x' })).to.be.false
			expect(isMatch({ geo: 'y' })).to.be.true
		})

		it('special "in" operator facilitates the Array.includes() functionality', () => {
			let { isMatch } = compile('_.page in [1, 2, 3]')
			expect(isMatch({ page: 1 })).to.be.true
			expect(isMatch({ page: 5 })).to.be.false
		})

		it('special "startsWith" operator facilitates the String.startsWith() functionality', () => {
			let { isMatch } = compile('_.page startsWith "x"')
			expect(isMatch({ page: 'x123' })).to.be.true
			expect(isMatch({ page: 'y123' })).to.be.false
		})

		it('special "endsWith" operator facilitates the String.endsWith() functionality', () => {
			let { isMatch } = compile('_.page endsWith "x"')
			expect(isMatch({ page: '123x' })).to.be.true
			expect(isMatch({ page: '123' })).to.be.false
		})

		it('special "match" operator performs literal regular expressions test', () => {
			let { isMatch } = compile('_.geo match "[0-9]"')
			expect(isMatch({ geo: '0' })).to.be.true
			expect(isMatch({ geo: 'x' })).to.be.false
		})

		it('special "deeplyEquals" operator performs deep equality', () => {
			let { isMatch } = compile('_.geo deeplyEquals [1, 2, 3]')
			expect(isMatch({ geo: [1, 2, 3] })).to.be.true
			expect(isMatch({ geo: [1, 2] })).to.be.false
		})

		it('compound "geo !== \'US\' && page in [1, 2, 3]" expression', () => {
			let { isMatch } = compile('_.geo !== \'US\' && _.page in [1, 2, 3]')
			expect(isMatch({ geo: 'x', page: 1 })).to.be.true
			expect(isMatch({ geo: 'US', page: 5 })).to.be.false
		})

		describe('exposes functions that are accessible in the expression', () => {
			describe.skip('built in javascript functions', () => {
				const functions = {
					isNaN: {
						t: { geo: 'z' },
						f: { geo: '1' },
					},
					encodeURI: {
						t: { geo: 'z' },
						f: { geo: '1' },
					}
				}

				it('escape', () => {
					let { isMatch } = compile('escape("123") === "123"')
					expect(isMatch()).to.be.true
				})

				it('isNaN', () => {
					let { isMatch } = compile('isNaN(_.geo)')
					expect(isMatch({ geo: 'bla' })).to.be.true
					expect(isMatch({ geo: '0' })).to.be.false
				})
			})

			describe('internal/default', () => {
				// t === truthy test, f === falsy test
				// both tests must have the same input parameters
				const functions = {
					deeplyEquals: {
						t: { geo: [1, 2, 3], page: [1, 2, 3] },
						f: { geo: [1, 2, 3], page: [1, 2] }
					},
					isNullOrUndefined: {
						t: { geo: null },
						f: { geo: 'x' }
					},
					isNull: {
						t: { geo: null },
						f: { geo: 'x' }
					},
					isUndefined: {
						t: { geo: undefined },
						f: { geo: 'x' }
					},
					isString: {
						t: { geo: 'x' },
						f: { geo: 1 }
					},
					isNumber: {
						t: { geo: 1 },
						f: { geo: 'x' }
					},
					isArray: {
						t: { geo: [1, 2, 3] },
						f: { geo: 'x' }
					},
					isObject: {
						t: { geo: {} },
						f: { geo: 'x' }
					},
					isBoolean: {
						t: { geo: true },
						f: { geo: 'x' }
					},
					isDate: {
						t: { geo: new Date() },
						f: { geo: 'x' }
					},
					isPrimitive: {
						t: { geo: 123 },
						f: { geo: {} }
					}
				}

				// make sure all functions are tests, if someone addes
				// functions this should alert them to the face they
				// need to expand the test
				for (let key in DEFAULT_ENVIRONMENT) {
					if (!isFunction(DEFAULT_ENVIRONMENT[key])) {
						continue
					}

					if (isUndefined(functions[key])) {
						throw new Error(`missing test for function ${key}`)
					}
				}

				for (let [fName, testData] of Object.entries(functions)) {
					it(fName, () => {
						let params = Object.keys(testData.t).map(key => `_.${key}`).join(',')
						let { isMatch } = compile(`${fName}(${params})`)
						expect(isMatch(testData.t)).to.be.true
						expect(isMatch(testData.f)).to.be.false
					})
				}
			})

			describe('allows the user to expose members and functions via "userEnvironment" property', () => {
				it('functions', () => {
					let userEnvironment = {
						isOk: (page) => page.startsWith('x')
					}

					let { isMatch } = compile('$.isOk(_.page)', { userEnvironment })
					expect(isMatch({ page: 'xyz' })).to.be.true
					expect(isMatch({ page: 'zzz' })).to.be.false
				})
			})
		})
	})

	it('and creates a set of all the features found in the expression', () => {
		let { features } = compile('_.geo === "x" && _.foo === "bar"')
		expect(Array.from(features)).to.eql(['geo', 'foo'])
	})
})