import { NextRequest, NextResponse } from 'next/server'
import { requestOtpAction, verifyOtpAction } from '@/app/auth/actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, identifier, code } = body

    if (action === 'send') {
      const res = await requestOtpAction(identifier)
      return NextResponse.json(res)
    }

    if (action === 'verify') {
      const res = await verifyOtpAction(identifier, code)
      return NextResponse.json(res)
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action specified. Use "send" or "verify".' },
      { status: 400 }
    )
  } catch (error: unknown) {
    console.error('OTP API Error:', error)
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred processing your request.' },
      { status: 500 }
    )
  }
}
