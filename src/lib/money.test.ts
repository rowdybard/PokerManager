import { describe, expect, it } from 'vitest'
import {
  addMoney,
  assertMinorAmount,
  compareMoney,
  formatMoney,
  money,
  subtractMoney,
} from './money'

describe('exact money helpers', () => {
  it('adds and subtracts integer minor units without floating-point arithmetic', () => {
    expect(addMoney(money('9007199254740993', 'USD'), money('7', 'USD'))).toEqual({
      amountMinor: '9007199254741000',
      currency: 'USD',
    })
    expect(subtractMoney(money('1050', 'USD'), money('250', 'USD'))).toEqual({
      amountMinor: '800',
      currency: 'USD',
    })
  })

  it('rejects decimals and mixed currencies', () => {
    expect(() => assertMinorAmount('10.50')).toThrow(/integer minor-unit/)
    expect(() => addMoney(money('100', 'USD'), money('100', 'CAD'))).toThrow(
      /same currency/,
    )
  })

  it('compares and formats positive and negative amounts', () => {
    expect(compareMoney(money('-1', 'USD'), money('0', 'USD'))).toBe(-1)
    expect(formatMoney(money('12345', 'USD'), 'en-US')).toBe('$123.45')
    expect(formatMoney(money('-500', 'USD'), 'en-US')).toBe('-$5.00')
    expect(formatMoney(money('9007199254740993', 'USD'), 'en-US')).toBe(
      '$90,071,992,547,409.93',
    )
  })
})
