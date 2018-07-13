const { expect } = require('chai')
const compile = require('./index')

describe('compile', () => {
	describe('an expression to a matcher javascript function', () => {
		it('simple "===" expression', () => {
			let { isMatch } = compile('geo === "x"')
			expect(isMatch({ geo: 'x' })).to.be.true
			expect(isMatch({ geo: 'y' })).to.be.false
		})

		it('simple "!==" expression', () => {
			let { isMatch } = compile('geo !== "x"')
			expect(isMatch({ geo: 'x' })).to.be.false
			expect(isMatch({ geo: 'y' })).to.be.true
		})

		it('special "in" operator facilitates the Array.includes() functionality', () => {
			let { isMatch } = compile('page in [1, 2, 3]')
			expect(isMatch({ page: 1 })).to.be.true
			expect(isMatch({ page: 5 })).to.be.false
		})

		it('special "match" operator facilitates literal regular expressions', () => {
			let { isMatch } = compile('geo match "[0-9]"')
			expect(isMatch({ geo: '0' })).to.be.true
			expect(isMatch({ geo: 'x' })).to.be.false
		})

		it('compound "geo !== \'US\' && page in [1, 2, 3]" expression', () => {
			let { isMatch } = compile('geo !== \'US\' && page in [1, 2, 3]')
			expect(isMatch({ geo: 'x', page: 1 })).to.be.true
			expect(isMatch({ geo: 'US', page: 5 })).to.be.false
		})

		describe('exposes functions that are accessible in the expression', () => {
			describe('inline', () => {
				it('isDefined', () => {
					let { isMatch } = compile('isDefined(geo)')
					expect(isMatch({ geo: 'x' })).to.be.true
					expect(isMatch({ page: 'x' })).to.be.false
				})

				it('native isNaN', () => {
					let { isMatch } = compile('isNaN(geo)')
					expect(isMatch({ geo: 'bla' })).to.be.true
					expect(isMatch({ geo: '0' })).to.be.false
				})
			})

			describe.only('internal/default', () => {
				it('isNullOrUndefined', () => {
					let { isMatch } = compile('isNullOrUndefined(geo)')
					expect(isMatch({ geo: null })).to.be.true
					expect(isMatch({ geo: 'x' })).to.be.false
				})

				it('isString', () => {
					let { isMatch } = compile('isString(geo)')
					expect(isMatch({ geo: 'x' })).to.be.true
					expect(isMatch({ geo: 0 })).to.be.false
				})

				it('isNumber', () => {
					let { isMatch } = compile('isNumber(geo)')
					expect(isMatch({ geo: 0 })).to.be.true
					expect(isMatch({ geo: 'x' })).to.be.false
				})

				it('isArray', () => {
					let { isMatch } = compile('isArray(geo)')
					expect(isMatch({ geo: [1, 2, 3] })).to.be.true
					expect(isMatch({ geo: 'x' })).to.be.false
				})
			})

			it('allows the user to add scope and functionality via "userEnvironment" property', () => {
				let userEnvironment = {
					isOk: (page) => page.startsWith('x')
				}

				let { isMatch } = compile('user.isOk(page)', { userEnvironment })
				expect(isMatch({ page: 'xyz' })).to.be.true
			})
		})
	})

	it('and creates a set of all the features found in the expression', () => {
		let { features } = compile('geo === "x" && foo === "bar"')
		expect(Array.from(features)).to.eql(['geo', 'foo'])
	})
})