import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { workerId, note } = body

    if (!workerId || !note) {
      return NextResponse.json(
        { success: false, error: 'Worker ID and note are required' },
        { status: 400 }
      )
    }

    // For now, we'll store field notes as feedback with type 'FIELD_NOTE'
    // If you have a separate FieldNote model, update this accordingly
    const feedback = await db.feedback.create({
      data: {
        userId: workerId,
        type: 'FIELD_NOTE' as any,
        subject: 'Field Note',
        message: note,
        status: 'SUBMITTED'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Field note submitted successfully',
      feedback
    })
  } catch (error) {
    console.error('Error submitting field note:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit field note' },
      { status: 500 }
    )
  }
}
