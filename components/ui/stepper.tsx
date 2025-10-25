/**
 * Stepper Component
 * Progress indicator for multi-step forms
 */

import type React from 'react'
import { Check } from 'lucide-react'

export interface StepperStep {
  title: string
  description?: string
}

export interface StepperProps {
  steps: StepperStep[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <li
              key={step.title}
              className={`flex-1 ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
            >
              <div className="group flex flex-col border-l-4 border-transparent pb-0 pl-4 pt-4 md:border-l-0 md:border-t-4 md:pb-4 md:pl-0 md:pt-4"
                style={{
                  borderColor: isCompleted || isCurrent ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <div className="flex items-center">
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                          ? 'border-2 border-primary bg-background text-primary'
                          : 'border-2 border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{stepNumber}</span>
                    )}
                  </span>
                  <div className="ml-4 min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-primary' : isPending ? 'text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-sm text-muted-foreground hidden sm:block">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
