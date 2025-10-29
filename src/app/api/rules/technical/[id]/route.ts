import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    id: string
  }
}

// GET - Get a specific technical rule by ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params

    const technicalRule = await prisma.ruleSet.findFirst({
      where: {
        id,
        type: 'TECHNICAL'
      },
      include: {
        technicalRule: {
          include: {
            serviceApprovals: true,
            diagnosisApprovals: true,
            paidAmountThreshold: true,
            idFormattingRules: true
          }
        }
      }
    })

    if (!technicalRule) {
      return NextResponse.json(
        { error: 'Technical rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(technicalRule)
  } catch (error) {
    console.error('Error fetching technical rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch technical rule' },
      { status: 500 }
    )
  }
}

// PUT - Update a technical rule
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params
    const body = await request.json()

    // First, check if the rule exists and is a technical rule
    const existingRule = await prisma.ruleSet.findFirst({
      where: { id, type: 'TECHNICAL' },
      include: { technicalRule: true }
    })

    if (!existingRule || !existingRule.technicalRule) {
      return NextResponse.json(
        { error: 'Technical rule not found' },
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
        technicalRule: {
          include: {
            serviceApprovals: true,
            diagnosisApprovals: true,
            paidAmountThreshold: true,
            idFormattingRules: true
          }
        }
      }
    })

    return NextResponse.json(updatedRule)
  } catch (error) {
    console.error('Error updating technical rule:', error)
    return NextResponse.json(
      { error: 'Failed to update technical rule' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a technical rule
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params

    await prisma.ruleSet.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Technical rule deleted successfully' })
  } catch (error) {
    console.error('Error deleting technical rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete technical rule' },
      { status: 500 }
    )
  }
}