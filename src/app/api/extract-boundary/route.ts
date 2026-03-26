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

    // Analyze the map image to extract boundary coordinates
    const response = await zai.chat.completions.createVision({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a map of San Policarpo, Eastern Samar, Philippines with its municipal boundary marked.

The municipal center is at approximately: 12.1792°N, 125.5072°E

Please look at the boundary line on this map and provide a list of coordinate points (latitude, longitude) that trace the boundary of San Policarpo municipality.

Provide the coordinates in a JSON array format like this:
\`\`\`json
{
  "boundary": [
    {"lat": 12.16, "lng": 125.43, "description": "Southwest corner"},
    {"lat": 12.17, "lng": 125.45, "description": "West coast"},
    ...
  ],
  "description": "Brief description of the boundary shape"
}
\`\`\`

Start from the northwest corner and trace the boundary clockwise (north, east, south, west, back to start).
Provide 10-15 key coordinate points that would create a reasonably accurate polygon for the municipal boundary.
Use decimal degrees format.`
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
    console.error('Error extracting boundary:', error)
    return NextResponse.json(
      {
        error: 'Failed to extract boundary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
