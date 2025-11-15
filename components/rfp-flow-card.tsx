/**
 * RFP Flow Progress Card
 *
 * Displays current RFP gathering progress, contextual questions, and field completion status.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RFPFlowState } from '@/hooks/use-rfp-flow';

interface RFPFlowCardProps {
  state: RFPFlowState;
  onGoBack?: () => void;
  showQuestion?: boolean;
  className?: string;
}

const STEP_LABELS: Record<string, string> = {
  route: 'Route',
  date: 'Travel Dates',
  passengers: 'Passengers',
  aircraft: 'Aircraft Type',
  budget: 'Budget & Requirements',
};

const REQUIRED_FIELDS = ['departure', 'arrival', 'departureDate', 'passengers'];

export function RFPFlowCard({
  state,
  onGoBack,
  showQuestion = true,
  className,
}: RFPFlowCardProps) {
  const { flow, isComplete, currentQuestion, completedFields, missingFields } = state;
  const currentStep = flow.getCurrentStep();

  // Calculate progress
  const allSteps = ['route', 'date', 'passengers', 'aircraft', 'budget'];
  const currentStepIndex = allSteps.indexOf(currentStep);
  const progress = isComplete ? 100 : ((currentStepIndex + 1) / allSteps.length) * 100;

  // Count required fields completed
  const requiredCompleted = REQUIRED_FIELDS.filter((field) =>
    completedFields.includes(field)
  ).length;
  const totalRequired = REQUIRED_FIELDS.length;

  return (
    <Card className={cn('border-blue-200 dark:border-blue-800', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-blue-700 dark:text-blue-300">
              RFP Information Gathering
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isComplete
                ? 'All required information collected'
                : `${requiredCompleted}/${totalRequired} required fields completed`}
            </CardDescription>
          </div>
          {isComplete ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
              Step {currentStepIndex + 1}/{allSteps.length}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Question */}
        {showQuestion && !isComplete && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
              {STEP_LABELS[currentStep]}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">{currentQuestion}</p>
          </div>
        )}

        {/* Step Indicators */}
        <div className="space-y-2">
          {allSteps.map((step, index) => {
            const isCurrentStep = step === currentStep;
            const isPastStep = index < currentStepIndex;
            const isOptional = step === 'aircraft' || step === 'budget';

            return (
              <div
                key={step}
                className={cn(
                  'flex items-center space-x-3 p-2 rounded-lg transition-colors',
                  isCurrentStep && 'bg-blue-50 dark:bg-blue-900/20',
                  isPastStep && 'bg-gray-50 dark:bg-gray-800'
                )}
              >
                {isPastStep || (isComplete && index <= currentStepIndex) ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : isCurrentStep ? (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                )}

                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isCurrentStep && 'text-blue-700 dark:text-blue-300',
                        isPastStep && 'text-gray-700 dark:text-gray-300',
                        !isCurrentStep && !isPastStep && 'text-gray-400 dark:text-gray-600'
                      )}
                    >
                      {STEP_LABELS[step]}
                    </span>
                    {isOptional && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                </div>

                {isCurrentStep && index > 0 && onGoBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onGoBack}
                    className="h-7 px-2 text-xs"
                  >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Back
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Collected Data Summary */}
        {completedFields.length > 0 && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Collected Information
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {state.data.departure && state.data.arrival && (
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-500">Route:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {state.data.departure} → {state.data.arrival}
                  </span>
                </div>
              )}
              {state.data.departureDate && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">Departure:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(state.data.departureDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {state.data.returnDate && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">Return:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(state.data.returnDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {state.data.passengers && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">Passengers:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">{state.data.passengers}</span>
                </div>
              )}
              {state.data.aircraftType && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">Aircraft:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">{state.data.aircraftType}</span>
                </div>
              )}
              {state.data.budget && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">Budget:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">
                    ${state.data.budget.toLocaleString()}
                  </span>
                </div>
              )}
              {state.data.specialRequirements && (
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-500">Requirements:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">
                    {state.data.specialRequirements}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Missing Required Fields Warning */}
        {missingFields.length > 0 && !isComplete && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">Required Information Missing</p>
                <p className="text-amber-600 dark:text-amber-400">
                  {missingFields.map((field) => field.replace(/([A-Z])/g, ' $1')).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
