import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
      }),
    },
  },
}))
vi.mock('./env', () => ({ env: { plaidEnabled: false } }))

import {
  createStakingAllocation,
  updateSettlementStatus,
  uploadSettlementConfirmation,
  type Settlement,
} from './pro'

const settlement: Settlement = {
  id: '00000000-0000-4000-8000-000000000010',
  owner_id: '00000000-0000-4000-8000-000000000001',
  session_id: null,
  direction: 'payable',
  counterparty: 'Test player',
  amount_minor: '1250',
  currency: 'USD',
  reason: 'Test',
  external_method: null,
  external_handle: null,
  provider_url: null,
  memo: null,
  due_date: '2026-01-01',
  status: 'pending',
  paid_at: null,
  confirmation_path: null,
  revision: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const operationKey = '10000000-0000-4000-8000-000000000001'

beforeEach(() => {
  mocks.rpc.mockReset()
  mocks.upload.mockReset()
  mocks.remove.mockReset()
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
})

describe('settlement transactional client', () => {
  it('sends status changes through the revision-locked RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ...settlement, status: 'paid', revision: 2 },
      error: null,
    })

    await expect(
      updateSettlementStatus(
        settlement.owner_id,
        settlement.id,
        'paid',
        settlement.revision,
        operationKey,
      ),
    ).resolves.toMatchObject({ status: 'paid', revision: 2 })
    expect(mocks.rpc).toHaveBeenCalledWith('transition_settlement', {
      p_settlement_id: settlement.id,
      p_new_status: 'paid',
      p_expected_revision: 1,
      p_idempotency_key: operationKey,
    })
  })

  it('replays an ambiguous attachment response with the same path and operation key', async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: '', message: 'Failed to fetch' },
      })
      .mockResolvedValueOnce({
        data: {
          ...settlement,
          confirmation_path: `${settlement.owner_id}/settlements/${settlement.id}/${operationKey}.pdf`,
          revision: 2,
        },
        error: null,
      })
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })

    const path = await uploadSettlementConfirmation(
      settlement.owner_id,
      settlement.id,
      settlement.revision,
      file,
      operationKey,
    )

    expect(path).toBe(
      `${settlement.owner_id}/settlements/${settlement.id}/${operationKey}.pdf`,
    )
    expect(mocks.rpc).toHaveBeenCalledTimes(2)
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1])
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('keeps an upload when the attachment outcome remains ambiguous', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '', message: 'Failed to fetch' },
    })
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })

    await expect(
      uploadSettlementConfirmation(
        settlement.owner_id,
        settlement.id,
        settlement.revision,
        file,
        operationKey,
      ),
    ).rejects.toThrow(/Retry the same file/)
    expect(mocks.rpc).toHaveBeenCalledTimes(2)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('removes an upload after a definitive server rejection', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'Invalid confirmation path' },
    })
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })

    await expect(
      uploadSettlementConfirmation(
        settlement.owner_id,
        settlement.id,
        settlement.revision,
        file,
        operationKey,
      ),
    ).rejects.toThrow(/Invalid confirmation path/)
    expect(mocks.remove).toHaveBeenCalledWith([
      `${settlement.owner_id}/settlements/${settlement.id}/${operationKey}.pdf`,
    ])
  })

  it('rejects empty and disallowed confirmation files before upload', async () => {
    await expect(
      uploadSettlementConfirmation(
        settlement.owner_id,
        settlement.id,
        settlement.revision,
        new File([], 'empty.pdf', { type: 'application/pdf' }),
        operationKey,
      ),
    ).rejects.toThrow(/cannot be empty/)
    await expect(
      uploadSettlementConfirmation(
        settlement.owner_id,
        settlement.id,
        settlement.revision,
        new File(['text'], 'receipt.txt', { type: 'text/plain' }),
        operationKey,
      ),
    ).rejects.toThrow(/PDF, JPEG, PNG, or WebP/)
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})

describe('staking transactional client', () => {
  it('records the allocation and makeup change through one idempotent RPC', async () => {
    const ownerId = settlement.owner_id
    const dealId = '20000000-0000-4000-8000-000000000001'
    const sessionId = '30000000-0000-4000-8000-000000000001'
    mocks.rpc.mockResolvedValue({
      data: {
        allocation: {
          id: '40000000-0000-4000-8000-000000000001',
          owner_id: ownerId,
          deal_id: dealId,
          session_id: sessionId,
          allocated_buy_in_minor: '10000',
          backer_result_minor: '7000',
          player_result_minor: '3000',
          settled_at: null,
          notes: null,
          created_at: '2026-07-26T00:00:00.000Z',
        },
        deal: {
          id: dealId,
          owner_id: ownerId,
          backer_name: 'Backer',
          name: 'Summer package',
          player_share_bps: 5000,
          backer_share_bps: 5000,
          markup_bps: 10000,
          makeup_minor: '0',
          currency: 'USD',
          starts_on: '2026-07-01',
          ends_on: null,
          status: 'active',
          notes: null,
          created_at: '2026-07-01T00:00:00.000Z',
        },
        makeup_before_minor: '4000',
        makeup_after_minor: '0',
      },
      error: null,
    })

    const result = await createStakingAllocation(ownerId, {
      deal_id: dealId,
      session_id: sessionId,
      allocated_buy_in_minor: '10000',
      total_result_minor: '10000',
      expected_makeup_minor: '4000',
      notes: null,
      idempotency_key: operationKey,
    })

    expect(result.makeup_after_minor).toBe('0')
    expect(result.allocation.player_result_minor).toBe('3000')
    expect(mocks.rpc).toHaveBeenCalledWith('record_staking_allocation', {
      p_owner_id: ownerId,
      p_deal_id: dealId,
      p_session_id: sessionId,
      p_allocated_buy_in_minor: '10000',
      p_total_result_minor: '10000',
      p_expected_makeup_minor: '4000',
      p_notes: null,
      p_idempotency_key: operationKey,
    })
  })
})
