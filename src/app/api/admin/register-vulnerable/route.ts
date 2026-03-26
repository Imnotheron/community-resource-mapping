import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()

    // Extract personal information
    const {
      lastName,
      firstName,
      middleName,
      suffix,
      dateOfBirth,
      gender,
      civilStatus,
      mobileNumber,
      landlineNumber,
      emailAddress,
      houseNumber,
      street,
      barangay,
      municipality,
      province,
      latitude,
      longitude,
      
      // Medical information
      hasDisability,
      disabilityType,
      disabilitySeverity,
      disabilityCause,
      disabilityDetails,
      medicalCertificateNumber,
      medicalCertificateDate,
      hasPhysicalEvidence,
      hasMedicalCondition,
      medicalConditions,
      needsAssistance,
      assistanceType,
      
      // Administrative information
      bloodType,
      guardianName,
      guardianRelationship,
      guardianContact,
      guardianAddress,
      philHealthNumber,
      sssNumber,
      gsisNumber,
      otherIdNumbers,
      educationalAttainment,
      schoolName,
      employmentStatus,
      employmentDetails,
      employerName,
      emergencyContact,
      emergencyPhone,
      
      // Documents
      hasPWDRegistrationForm,
      pwdRegistrationForm,
      hasMedicalCertificate,
      medicalCertificate,
      hasProofOfIdentity,
      proofOfIdentity,
      hasProofOfResidence,
      proofOfResidence,
      hasIDPhotos,
      idPhotos,
      
      adminId
    } = formData

    // Validate required fields
    if (!lastName || !firstName || !emailAddress || !mobileNumber || !barangay) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: emailAddress }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      )
    }

    // Generate a simple, readable temporary password (easy to type from email)
    const generateSimplePassword = () => {
      const letters = 'abcdefghjkmnpqrstuvwxyz' // no i, l, o to avoid confusion
      const digits = '23456789' // no 0, 1 to avoid confusion
      let password = ''
      // 4 letters + 4 digits pattern like "user4k7m"
      for (let i = 0; i < 4; i++) {
        password += letters.charAt(Math.floor(Math.random() * letters.length))
      }
      for (let i = 0; i < 4; i++) {
        password += digits.charAt(Math.floor(Math.random() * digits.length))
      }
      return password
    }
    const defaultPassword = generateSimplePassword()
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    // Create user
    const user = await db.user.create({
      data: {
        name: `${firstName} ${middleName || ''} ${lastName}`.trim(),
        email: emailAddress,
        password: hashedPassword,
        role: 'VULNERABLE',
        phone: mobileNumber
      }
    })

    // Build vulnerability types array
    const vulnerabilityTypes: string[] = []
    if (hasDisability && disabilityType) {
      vulnerabilityTypes.push(disabilityType.toUpperCase().replace(/ /g, '_'))
    }
    if (needsAssistance) {
      vulnerabilityTypes.push('NEEDS_ASSISTANCE')
    }

    // Create vulnerable profile with APPROVED status (admin-registered)
    const profile = await db.vulnerableProfile.create({
      data: {
        userId: user.id,
        // Personal Information
        lastName: lastName || '',
        firstName: firstName || '',
        middleName: middleName || '',
        suffix: suffix || '',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        civilStatus: civilStatus || null,
        mobileNumber: mobileNumber || '',
        landlineNumber: landlineNumber || '',
        emailAddress: emailAddress || '',
        
        // Address
        houseNumber: houseNumber || '',
        street: street || '',
        barangay: barangay || '',
        municipality: municipality || 'San Policarpo',
        province: province || 'Eastern Samar',
        latitude: parseFloat(latitude) || 12.1792,
        longitude: parseFloat(longitude) || 125.5072,
        
        // Educational & Employment
        educationalAttainment: educationalAttainment || '',
        employmentStatus: employmentStatus || '',
        employmentDetails: employmentDetails ? `${employmentDetails}${employerName ? ` at ${employerName}` : ''}` : '',
        
        // Vulnerability Information
        vulnerabilityTypes: JSON.stringify(vulnerabilityTypes),
        disabilityType: hasDisability ? disabilityType || '' : '',
        disabilityCause: hasDisability ? disabilityCause || '' : '',
        disabilityIdNumber: hasDisability ? medicalCertificateNumber || '' : '',
        
        // Emergency Contact
        emergencyContact: emergencyContact || '',
        emergencyPhone: emergencyPhone || '',
        
        // Medical & Assistance
        hasMedicalCondition: !!hasMedicalCondition,
        medicalConditions: hasMedicalCondition ? medicalConditions || '' : '',
        needsAssistance: !!needsAssistance,
        assistanceType: needsAssistance ? assistanceType || '' : '',
        
        // Representative Information
        hasRepresentative: !!guardianName,
        representativeName: guardianName || '',
        representativeRelationship: guardianRelationship || '',
        representativePhone: guardianContact || '',
        representativeEmail: guardianAddress || '', // Using guardianAddress as email for now
        hasAuthorizationLetter: false,
        
        // Registration Status - Auto-approved for admin registration
        registrationStatus: 'APPROVED',
        rejectionReason: null
      }
    })

    // Create household record
    await db.household.create({
      data: {
        address: `${houseNumber || ''} ${street || ''}, ${barangay || ''}`,
        barangay: barangay || '',
        latitude: parseFloat(latitude) || 12.1792,
        longitude: parseFloat(longitude) || 125.5072,
        headOfHousehold: `${lastName}, ${firstName}`,
        totalMembers: 1,
        vulnerableMembers: 1,
        vulnerableProfileId: profile.id
      }
    })

    // Create document records (placeholder for file upload handling)
    const documents: any[] = []
    if (hasPWDRegistrationForm) {
      const doc = await db.vulnerabilityDocument.create({
        data: {
          profileId: profile.id,
          documentType: 'PWD_REGISTRATION_FORM',
          fileName: 'PWD_Registration_Form.pdf',
          fileUrl: '/uploads/placeholder.pdf'
        }
      })
      documents.push(doc)
    }
    if (hasMedicalCertificate) {
      const doc = await db.vulnerabilityDocument.create({
        data: {
          profileId: profile.id,
          documentType: 'MEDICAL_CERTIFICATE',
          fileName: 'Medical_Certificate.pdf',
          fileUrl: '/uploads/placeholder.pdf'
        }
      })
      documents.push(doc)
    }
    if (hasProofOfIdentity) {
      const doc = await db.vulnerabilityDocument.create({
        data: {
          profileId: profile.id,
          documentType: 'PROOF_OF_IDENTITY',
          fileName: 'Proof_of_Identity.pdf',
          fileUrl: '/uploads/placeholder.pdf'
        }
      })
      documents.push(doc)
    }
    if (hasProofOfResidence) {
      const doc = await db.vulnerabilityDocument.create({
        data: {
          profileId: profile.id,
          documentType: 'PROOF_OF_RESIDENCE',
          fileName: 'Proof_of_Residence.pdf',
          fileUrl: '/uploads/placeholder.pdf'
        }
      })
      documents.push(doc)
    }

    // Send email notification with the temporary password
    const { sendVulnerableRegistrationApprovedEmail } = await import('@/lib/email')
    sendVulnerableRegistrationApprovedEmail(emailAddress, `${firstName} ${lastName}`, defaultPassword)
      .catch(err => console.error('Failed to send email:', err))

    return NextResponse.json({
      success: true,
      message: 'Vulnerable person registered successfully and auto-approved!',
      profile: {
        id: profile.id,
        fullName: `${profile.firstName} ${profile.lastName}`,
        registrationStatus: profile.registrationStatus
      },
      user: {
        id: user.id,
        email: user.email,
        defaultPassword
      }
    })
  } catch (error: any) {
    console.error('Error registering vulnerable person (admin):', error)
    // Handle Prisma unique constraint violation (email already exists)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'This email address is already registered in the system.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Failed to register vulnerable person', error: error.message, code: error.code },
      { status: 500 }
    )
  }
}
