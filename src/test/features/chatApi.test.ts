import { describe, it, expect } from 'vitest'
import { buildConversationId } from '../../features/chat/chatApi'

describe('buildConversationId', () => {
  it('produces a deterministic id regardless of uid argument order', () => {
    const id1 = buildConversationId('sailorAAA', 'captainBBB', 'boat123')
    const id2 = buildConversationId('captainBBB', 'sailorAAA', 'boat123')
    expect(id1).toBe(id2)
  })

  it('includes the boatId in the result', () => {
    const id = buildConversationId('userA', 'userB', 'boat-xyz')
    expect(id).toContain('boat-xyz')
  })

  it('produces different ids for different boats with the same participants', () => {
    const id1 = buildConversationId('userA', 'userB', 'boat-001')
    const id2 = buildConversationId('userA', 'userB', 'boat-002')
    expect(id1).not.toBe(id2)
  })

  it('produces different ids for different participant pairs', () => {
    const id1 = buildConversationId('userA', 'userB', 'boat-001')
    const id2 = buildConversationId('userA', 'userC', 'boat-001')
    expect(id1).not.toBe(id2)
  })

  it('sorts uids alphabetically so the id is stable', () => {
    // 'captainBBB' < 'sailorAAA' alphabetically
    const id = buildConversationId('sailorAAA', 'captainBBB', 'boat1')
    expect(id.startsWith('captainBBB_sailorAAA')).toBe(true)
  })
})
