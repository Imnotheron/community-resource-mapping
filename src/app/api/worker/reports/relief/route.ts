export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { getReliefReport } from '@/lib/relief-report-server'

export async function GET(request: NextRequest) {
  return getReliefReport(request, 'WORKER')
}
