import { describe, it, expect } from 'vitest';
import { mapPlaidTransactions } from './plaidMap';
import type { PlaidTxLike } from './plaidMap';

function makeTx(overrides: Partial<PlaidTxLike> = {}): PlaidTxLike {
  return {
    date: '2026-07-10',
    authorized_date: null,
    name: 'SAFEWAY #123',
    merchant_name: 'Safeway',
    amount: 42.1, // Plaid: positive = outflow
    pending: false,
    personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' },
    ...overrides,
  };
}

describe('mapPlaidTransactions', () => {
  it('flips the sign: Plaid outflow becomes negative, inflow positive', () => {
    const [outflow] = mapPlaidTransactions([makeTx({ amount: 42.1 })]);
    expect(outflow.amount).toBe(-42.1);

    const [inflow] = mapPlaidTransactions([
      makeTx({
        amount: -2400,
        name: 'AMAZON PAYROLL',
        merchant_name: null,
        personal_finance_category: { primary: 'INCOME', detailed: 'INCOME_WAGES' },
      }),
    ]);
    expect(inflow.amount).toBe(2400);
    expect(inflow.category).toBe('income');
  });

  it('drops pending and zero-amount transactions', () => {
    const mapped = mapPlaidTransactions([
      makeTx({ pending: true }),
      makeTx({ amount: 0 }),
      makeTx(),
    ]);
    expect(mapped).toHaveLength(1);
  });

  it('prefers merchant_name, falls back to name', () => {
    expect(mapPlaidTransactions([makeTx()])[0].description).toBe('Safeway');
    expect(
      mapPlaidTransactions([makeTx({ merchant_name: null })])[0].description,
    ).toBe('SAFEWAY #123');
  });

  it('prefers authorized_date over posted date', () => {
    const [t] = mapPlaidTransactions([makeTx({ authorized_date: '2026-07-08' })]);
    expect(t.date).toBe('2026-07-08');
  });

  it('maps PFC detailed before primary (groceries beat FOOD_AND_DRINK)', () => {
    const [groceries] = mapPlaidTransactions([makeTx()]);
    expect(groceries.category).toBe('groceries');

    const [dining] = mapPlaidTransactions([
      makeTx({
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_RESTAURANT',
        },
      }),
    ]);
    expect(dining.category).toBe('dining_out');
  });

  it('maps streaming/gym detailed categories to subscriptions', () => {
    const [t] = mapPlaidTransactions([
      makeTx({
        name: 'Netflix',
        merchant_name: 'Netflix',
        personal_finance_category: {
          primary: 'ENTERTAINMENT',
          detailed: 'ENTERTAINMENT_TV_AND_MOVIES',
        },
      }),
    ]);
    expect(t.category).toBe('subscriptions');
  });

  it('falls back to the keyword categorizer when PFC is missing or unmapped', () => {
    const [byKeyword] = mapPlaidTransactions([
      makeTx({
        name: 'LYFT RIDE 7/10',
        merchant_name: 'Lyft',
        personal_finance_category: null,
      }),
    ]);
    expect(byKeyword.category).toBe('transport');

    const [unknown] = mapPlaidTransactions([
      makeTx({
        name: 'MYSTERY VENDOR',
        merchant_name: null,
        personal_finance_category: { primary: 'GOVERNMENT_AND_NON_PROFIT', detailed: 'X' },
      }),
    ]);
    expect(unknown.category).toBe('other');
  });

  it('sorts ascending by date', () => {
    const mapped = mapPlaidTransactions([
      makeTx({ date: '2026-07-15' }),
      makeTx({ date: '2026-06-01' }),
      makeTx({ date: '2026-07-01' }),
    ]);
    expect(mapped.map((t) => t.date)).toEqual(['2026-06-01', '2026-07-01', '2026-07-15']);
  });
});
