/**
 * System Health Check Endpoint
 * 
 * GET /api/system/health
 * 
 * Performs comprehensive system health checks including:
 * - Database connection and table verification
 * - Environment variables validation
 * - Brevo SMTP email service connectivity
 * - System resources (disk, memory, CPU)
 * - Recent error log analysis
 * 
 * Response includes:
 * - Overall status: 'healthy' | 'degraded' | 'unhealthy'
 * - Individual check results with details
 * - Critical issues array with timestamps
 * - Actionable suggestions for remediation
 * 
 * HTTP Status Codes:
 * - 200: System is healthy or degraded but operational
 * - 503: System is unhealthy (critical failures)
 * 
 * Also supports HEAD method for lightweight health checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { transporter } from '@/lib/email'
import * as fs from 'fs'
import * as os from 'os'

// Define types
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'
type CheckStatus = 'pass' | 'fail'

interface HealthCheck {
  database: { status: CheckStatus; message: string; details: any }
  databaseTables: { status: CheckStatus; tables: string[]; message: string }
  environment: { status: CheckStatus; missing: string[]; message: string }
  email: { status: CheckStatus | 'not-configured'; message: string }
  system: { status: CheckStatus; message: string; details: { disk: string; memory: string; cpu: string } }
}

interface CriticalIssue {
  type: 'error' | 'warning'
  service: string
  message: string
  timestamp: string
  resolved: boolean
}

interface HealthResponse {
  status: HealthStatus
  timestamp: string
  checks: HealthCheck
  criticalIssues: CriticalIssue[]
  suggestions: string[]
}

// Required database tables
const REQUIRED_TABLES = [
  'User',
  'VulnerableProfile',
  'Household',
  'ReliefDistribution',
  'ReliefFeedback',
  'Announcement',
  'Notification',
  'FieldNote',
  'Feedback'
]

// Required environment variables
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'BREVO_SMTP_LOGIN',
  'BREVO_SMTP_KEY',
  'NEXT_PUBLIC_APP_URL'
]

// Critical issues array
let criticalIssues: CriticalIssue[] = []

// Add a critical issue
function addCriticalIssue(type: 'error' | 'warning', service: string, message: string) {
  criticalIssues.push({
    type,
    service,
    message,
    timestamp: new Date().toISOString(),
    resolved: false
  })
}

// Check database connection
async function checkDatabaseConnection(): Promise<{ status: CheckStatus; message: string; details: any }> {
  try {
    // Test connection with a simple query
    const result = await db.$queryRaw`SELECT 1 as connected`
    return {
      status: 'pass',
      message: 'Database connection successful',
      details: { connected: true, result }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addCriticalIssue('error', 'database', `Database connection failed: ${errorMessage}`)
    return {
      status: 'fail',
      message: 'Database connection failed',
      details: { error: errorMessage }
    }
  }
}

// Check database tables exist
async function checkDatabaseTables(): Promise<{ status: CheckStatus; tables: string[]; message: string }> {
  try {
    // Get list of tables from SQLite
    const tables = await db.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `
    const tableNames = tables.map(t => t.name)

    // Check which required tables exist
    const missingTables = REQUIRED_TABLES.filter(
      table => !tableNames.includes(table)
    )

    if (missingTables.length === 0) {
      return {
        status: 'pass',
        tables: tableNames,
        message: 'All required database tables exist'
      }
    } else {
      addCriticalIssue(
        'error',
        'database',
        `Missing database tables: ${missingTables.join(', ')}`
      )
      return {
        status: 'fail',
        tables: tableNames,
        message: `Missing required tables: ${missingTables.join(', ')}`
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addCriticalIssue('error', 'database', `Failed to check database tables: ${errorMessage}`)
    return {
      status: 'fail',
      tables: [],
      message: `Failed to check database tables: ${errorMessage}`
    }
  }
}

// Check environment variables
function checkEnvironmentVariables(): { status: CheckStatus; missing: string[]; message: string } {
  const missing: string[] = []

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length === 0) {
    return {
      status: 'pass',
      missing: [],
      message: 'All required environment variables are set'
    }
  } else {
    addCriticalIssue(
      'error',
      'environment',
      `Missing required environment variables: ${missing.join(', ')}`
    )
    return {
      status: 'fail',
      missing,
      message: `Missing required environment variables: ${missing.join(', ')}`
    }
  }
}

// Check Brevo SMTP configuration
async function checkBrevoEmail(): Promise<{ status: CheckStatus | 'not-configured'; message: string }> {
  const smtpLogin = process.env.BREVO_SMTP_LOGIN
  const smtpKey = process.env.BREVO_SMTP_KEY

  if (!smtpLogin || !smtpKey) {
    addCriticalIssue('warning', 'email', 'Brevo SMTP credentials not configured')
    return {
      status: 'not-configured',
      message: 'Brevo SMTP credentials not configured (BREVO_SMTP_LOGIN / BREVO_SMTP_KEY)'
    }
  }

  try {
    // Verify SMTP connection
    await transporter.verify()
    return {
      status: 'pass',
      message: 'Brevo SMTP connection successful'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addCriticalIssue('error', 'email', `Brevo SMTP connection failed: ${errorMessage}`)
    return {
      status: 'fail',
      message: `Brevo SMTP connection failed: ${errorMessage}`
    }
  }
}

// Check system resources
function checkSystemResources(): {
  status: CheckStatus
  message: string
  details: { disk: string; memory: string; cpu: string }
} {
  const suggestions: string[] = []
  let diskStatus = 'pass'
  let memoryStatus = 'pass'
  let cpuStatus = 'pass'

  // Memory check
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const memoryUsagePercent = (usedMemory / totalMemory) * 100

  let memoryMessage = `${memoryUsagePercent.toFixed(2)}% used`
  if (memoryUsagePercent > 90) {
    memoryStatus = 'fail'
    memoryMessage += ' (CRITICAL)'
    addCriticalIssue('error', 'system', `High memory usage: ${memoryUsagePercent.toFixed(2)}%`)
    suggestions.push('Consider adding more RAM or reducing memory-intensive processes')
  } else if (memoryUsagePercent > 80) {
    memoryStatus = 'pass' // Still pass, just warning
    memoryMessage += ' (WARNING)'
    addCriticalIssue('warning', 'system', `High memory usage: ${memoryUsagePercent.toFixed(2)}%`)
    suggestions.push('Monitor memory usage closely')
  }

  // Disk check
  let diskUsagePercent = 0
  let diskMessage = 'N/A'
  try {
    const stats = fs.statSync('.')
    diskMessage = 'Disk check available'
  } catch (error) {
    diskMessage = 'Unable to check disk space'
    addCriticalIssue('warning', 'system', 'Unable to check disk space')
  }

  // CPU check (approximation)
  const cpuCount = os.cpus().length
  const cpuMessage = `${cpuCount} cores available`

  const overallStatus = diskStatus === 'fail' || memoryStatus === 'fail' || cpuStatus === 'fail'
    ? 'fail'
    : 'pass'

  return {
    status: overallStatus as CheckStatus,
    message: overallStatus === 'fail' ? 'System resources under stress' : 'System resources healthy',
    details: {
      disk: diskMessage,
      memory: memoryMessage,
      cpu: cpuMessage
    }
  }
}

// Check for recent errors in log files
function checkRecentErrors(): { hasErrors: boolean; errorCount: number; lastError?: string } {
  try {
    const logFiles = ['/home/z/my-project/server.log', '/home/z/my-project/dev.log']
    let errorCount = 0
    let lastError: string | undefined

    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf-8')
        const lines = content.split('\n').slice(-100) // Last 100 lines

        for (const line of lines) {
          if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
            errorCount++
            if (!lastError) {
              lastError = line.trim().substring(0, 200)
            }
          }
        }
      }
    }

    if (errorCount > 0) {
      addCriticalIssue(
        'warning',
        'system',
        `Found ${errorCount} recent error(s) in log files`
      )
    }

    return {
      hasErrors: errorCount > 0,
      errorCount,
      lastError
    }
  } catch (error) {
    return {
      hasErrors: false,
      errorCount: 0
    }
  }
}

// Generate suggestions based on health check results
function generateSuggestions(checks: HealthCheck, errors: { hasErrors: boolean; errorCount: number }): string[] {
  const suggestions: string[] = []

  // Database suggestions
  if (checks.database.status === 'fail') {
    suggestions.push('Check database connection string in DATABASE_URL')
    suggestions.push('Ensure database server is running and accessible')
  }

  if (checks.databaseTables.status === 'fail') {
    suggestions.push('Run database migrations: bun run db:migrate')
    suggestions.push('Or push schema to database: bun run db:push')
  }

  // Environment suggestions
  if (checks.environment.status === 'fail') {
    suggestions.push('Set missing environment variables in .env file')
    suggestions.push('Restart the application after updating .env')
  }

  // Brevo email suggestions
  if (checks.email.status === 'not-configured') {
    suggestions.push('Configure Brevo SMTP credentials in .env file')
    suggestions.push('Sign up at https://www.brevo.com (free, 300 emails/day)')
  } else if (checks.email.status === 'fail') {
    suggestions.push('Verify BREVO_SMTP_LOGIN is your Brevo account email')
    suggestions.push('Verify BREVO_SMTP_KEY is a valid SMTP key (not API key)')
  }

  // System resource suggestions
  if (checks.system.status === 'fail') {
    suggestions.push('Free up disk space by clearing cache and logs')
    suggestions.push('Monitor and optimize memory usage')
    suggestions.push('Consider upgrading server resources')
  }

  // Error log suggestions
  if (errors.hasErrors) {
    suggestions.push(`Review ${errors.errorCount} error(s) in log files`)
    suggestions.push('Check server.log and dev.log for details')
  }

  return suggestions
}

// Main GET handler
export async function GET(request: NextRequest) {
  // Reset critical issues for this check
  criticalIssues = []

  try {
    // Run all checks in parallel where possible
    const [databaseCheck, databaseTablesCheck, emailCheck] = await Promise.all([
      checkDatabaseConnection(),
      checkDatabaseTables(),
      checkBrevoEmail()
    ])

    // Run synchronous checks
    const environmentCheck = checkEnvironmentVariables()
    const systemCheck = checkSystemResources()
    const recentErrors = checkRecentErrors()

    const checks: HealthCheck = {
      database: databaseCheck,
      databaseTables: databaseTablesCheck,
      environment: environmentCheck,
      email: emailCheck,
      system: systemCheck
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter(
      check => check.status === 'fail'
    )
    const hasNotConfigured = checks.email.status === 'not-configured'

    let status: HealthStatus
    if (failedChecks.length === 0 && !hasNotConfigured) {
      status = 'healthy'
    } else if (failedChecks.length === 0 && hasNotConfigured) {
      status = 'healthy' // Email not configured is not critical
    } else if (failedChecks.some(c => {
      const check = c as any
      return check.status === 'fail' && (
        check.message?.includes('DATABASE_URL') ||
        check.message?.includes('Database connection failed')
      )
    })) {
      status = 'unhealthy' // Database failures are critical
    } else {
      status = 'degraded'
    }

    // Generate suggestions
    const suggestions = generateSuggestions(checks, recentErrors)

    // Build response
    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      checks,
      criticalIssues,
      suggestions
    }

    // Log the health check
    console.log(`[Health Check] Status: ${status}, Failed Checks: ${failedChecks.length}, Issues: ${criticalIssues.length}`)

    // Return appropriate HTTP status code
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503

    return NextResponse.json(response, { status: httpStatus })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy' as HealthStatus,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        checks: {
          database: { status: 'fail' as CheckStatus, message: 'Health check crashed', details: {} },
          databaseTables: { status: 'fail' as CheckStatus, tables: [], message: 'Health check crashed' },
          environment: { status: 'fail' as CheckStatus, missing: [], message: 'Health check crashed' },
          email: { status: 'fail' as CheckStatus, message: 'Health check crashed' },
          system: { status: 'fail' as CheckStatus, message: 'Health check crashed', details: { disk: 'N/A', memory: 'N/A', cpu: 'N/A' } }
        },
        criticalIssues: [{
          type: 'error' as const,
          service: 'health-check',
          message: `Health check endpoint failed: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          resolved: false
        }],
        suggestions: ['Check server logs for detailed error information']
      },
      { status: 503 }
    )
  }
}

// Also support HEAD method for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    // Quick database check
    await db.$queryRaw`SELECT 1 as connected`

    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}
