import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    id: string
  }
}

// GET - Get a specific medical rule by ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params

    const medicalRule = await prisma.ruleSet.findFirst({
      where: {
        id,
        type: 'MEDICAL'
      },
      include: {
        medicalRule: {
          include: {
            encounterTypes: true,
            facilityTypes: true,
            facilityRegistry: true,
            diagnosisRequirements: true,
            mutuallyExclusiveDiagnoses: true
          }
        }
      }
    })

    if (!medicalRule) {
      return NextResponse.json(
        { error: 'Medical rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(medicalRule)
  } catch (error) {
    console.error('Error fetching medical rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical rule' },
      { status: 500 }
    )
  }
}

// PUT - Update a medical rule
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params
    const body = await request.json()

    // First, check if the rule exists and is a medical rule
    const existingRule = await prisma.ruleSet.findFirst({
      where: { id, type: 'MEDICAL' },
      include: { medicalRule: true }
    })

    if (!existingRule || !existingRule.medicalRule) {
      return NextResponse.json(
        { error: 'Medical rule not found' },
        { status: 404 }
      )
    }

    // Update the rule set
    const updatedRule = await prisma.ruleSet.update({
      where: { id },
      data: {
        title: body.title,
        framing: body.framing,
        updatedAt: new Date()
      },
      include: {
        medicalRule: {
          include: {
            encounterTypes: true,
            facilityTypes: true,
            facilityRegistry: true,
            diagnosisRequirements: true,
            mutuallyExclusiveDiagnoses: true
          }
        }
      }
    })

    return NextResponse.json(updatedRule)
  } catch (error) {
    console.error('Error updating medical rule:', error)
    return NextResponse.json(
      { error: 'Failed to update medical rule' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a medical rule
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params

    await prisma.ruleSet.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Medical rule deleted successfully' })
  } catch (error) {
    console.error('Error deleting medical rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete medical rule' },
      { status: 500 }
    )
  }
}