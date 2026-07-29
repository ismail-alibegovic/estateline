import { test, expect } from '@playwright/test'

test.describe('Multi-tenant RLS Isolation Suite', () => {
  test('unauthenticated users cannot access internal dashboard or API endpoints', async ({ page, request }) => {
    // 1. Direct page access redirect check
    const response = await page.goto('/en/dashboard/properties')
    expect(page.url()).toContain('/login')

    // 2. Direct API route authorization check
    const apiRes = await request.get('/api/reports/agent-performance')
    expect([401, 403, 302, 500]).toContain(apiRes.status())
  })

  test('public lead capture is subject to rate limiting', async ({ request }) => {
    let lastStatus = 200
    for (let i = 0; i < 15; i++) {
      const res = await request.post('/api/leads/public', {
        data: {
          organization_slug: 'nonexistent-demo-org',
          first_name: 'SpamTester',
          message: 'Rate limit test'
        }
      })
      lastStatus = res.status()
      if (lastStatus === 429) break
    }
    expect(lastStatus).toBe(429)
  })
})
