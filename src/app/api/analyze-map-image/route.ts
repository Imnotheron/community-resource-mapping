export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageName } = body

    if (!imageName) {
      return NextResponse.json(
        { error: 'imageName is required' },
        { status: 400 }
      )
    }

    // SECURITY: Sanitize filename to prevent path traversal
    const safeImageName = path.basename(imageName)

    // Path to the uploaded image
    const imagePath = path.join(process.cwd(), 'upload', safeImageName)

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = imageName.endsWith('.png') ? 'image/png' : 'image/jpeg'

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Analyze the map image
    const response = await zai.chat.completions.createVision({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a map of San Policarpo, Eastern Samar, Philippines showing municipal boundaries.

Please analyze this map and provide:
1. A description of what you see in the map (landmarks, barangays, roads, etc.)
2. If there are boundary lines visible, describe their shape and location
3. If possible, estimate the approximate geographic coordinates (latitude/longitude) for key boundary points

The municipal center is approximately at: 12.1792°N, 125.5072°E
The municipality has 17 barangays including: Alugan, Bahay, Bangon, Baras (Lipata), Binogawan, Cajagwayan, Japunan, Natividad, Pangpang, Barangay No. 1-5 (Poblacion), Santa Cruz, Tabo, and Tan-awan.

Please be as specific as possible about any visible boundary lines or municipal limits shown in the image.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    })

    const analysis = response.choices[0]?.message?.content

    return NextResponse.json({
      success: true,
      analysis,
      imageName
    })

  } catch (error) {
    console.error('Error analyzing map image:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
