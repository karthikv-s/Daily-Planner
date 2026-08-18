'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { OtpInput } from '@/components/ui/otp-input'
import { requestOtpAction, verifyOtpAction, resetPasswordWithOtpAction } from '@/app/auth/actions'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, Lock, KeyRound, ArrowRight, CheckCircle2, RefreshCw, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { detectIdentifierType, IdentifierType } from '@/lib/otp-utils'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1) // 1: Input Identifier, 2: Enter OTP, 3: New Password, 4: Success
  const [identifier, setIdentifier] = useState('')
  const [identifierType, setIdentifierType] = useState<IdentifierType>('email')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const canResend = resendTimer === 0

  // Resend countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, resendTimer])

  // Step 1: Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!identifier.trim()) {
      toast.error('Please enter your email or phone number')
      return
    }

    setIsLoading(true)
    const type = detectIdentifierType(identifier)
    setIdentifierType(type)

    const res = await requestOtpAction(identifier)
    setIsLoading(false)

    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success(res.message)
      setOtpCode('')
      setStep(2)
      setResendTimer(60)
    }
  }



  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit OTP code')
      return
    }

    setIsLoading(true)
    const res = await verifyOtpAction(identifier, otpCode)
    setIsLoading(false)

    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success('OTP verified! Please set your new password.')
      setStep(3)
    }
  }

  // Step 3: Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    const res = await resetPasswordWithOtpAction(identifier, otpCode, newPassword)
    setIsLoading(false)

    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success('Password updated successfully!')
      setStep(4)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border border-border/60 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-2 text-center pb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
            <CardDescription className="text-sm">
              {step === 1 && 'Enter your registered Email or Phone number to receive an OTP code.'}
              {step === 2 && `Enter the 6-digit OTP code sent to your ${identifierType}.`}
              {step === 3 && 'Choose a strong new password for your account.'}
              {step === 4 && 'Your password has been successfully reset!'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <AnimatePresence mode="wait">
              {/* STEP 1: Enter Identifier */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSendOtp}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email ID or Phone Number
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {identifier.includes('@') ? (
                          <Mail className="h-4 w-4 text-primary" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                      </div>
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="email@example.com or +1234567890"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 font-semibold shadow-md gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      'Sending OTP...'
                    ) : (
                      <>
                        Send Verification Code <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              )}

              {/* STEP 2: Enter 6-digit OTP */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center block">
                      6-Digit Security Code
                    </Label>
                    <OtpInput
                      length={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                    >
                      <ArrowLeft className="h-3 w-3" /> Change identifier
                    </button>

                    <button
                      type="button"
                      disabled={!canResend || isLoading}
                      onClick={() => handleSendOtp()}
                      className="inline-flex items-center gap-1 font-semibold text-primary disabled:opacity-50 hover:underline"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                      {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                    </button>
                  </div>

                  <Button
                    className="w-full h-11 font-semibold shadow-md gap-2"
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                  >
                    {isLoading ? (
                      'Verifying Code...'
                    ) : (
                      <>
                        Verify OTP <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              )}

              {/* STEP 3: Reset Password */}
              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleResetPassword}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New Password
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground transition-colors p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground transition-colors p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 font-semibold shadow-md gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Resetting Password...' : 'Update Password'}
                  </Button>
                </motion.form>
              )}

              {/* STEP 4: Success */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4 py-4"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your password has been reset successfully. You can now log in with your updated password.
                  </p>
                  <Button
                    className="w-full h-11 font-semibold shadow-md"
                    onClick={() => router.push('/login')}
                  >
                    Back to Login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          {step !== 4 && (
            <CardFooter className="flex flex-col space-y-4 pt-2 border-t border-border/40">
              <div className="text-center text-sm text-muted-foreground w-full">
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
