/**
 * Form Field Component
 *
 * Displays an inline form field within a chat message,
 * allowing users to input data conversationally.
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send } from 'lucide-react';
import { FormFieldComponent } from './types';

export interface FormFieldProps {
  field: FormFieldComponent['field'];
  onSubmit?: (name: string, value: string | number) => void;
  onChange?: (name: string, value: string | number) => void;
  className?: string;
}

export function FormField({ field, onSubmit, onChange, className }: FormFieldProps) {
  const [value, setValue] = useState<string | number>(field.value || '');
  const [error, setError] = useState<string>('');

  const handleChange = (newValue: string | number) => {
    setValue(newValue);
    setError('');
    onChange?.(field.name, newValue);
  };

  const validate = (): boolean => {
    if (field.required && !value) {
      setError('This field is required');
      return false;
    }

    if (field.validation) {
      const v = field.validation;

      if (v.pattern && typeof value === 'string') {
        const regex = new RegExp(v.pattern);
        if (!regex.test(value)) {
          setError('Invalid format');
          return false;
        }
      }

      if (v.min !== undefined && typeof value === 'number' && value < v.min) {
        setError(`Minimum value is ${v.min}`);
        return false;
      }

      if (v.max !== undefined && typeof value === 'number' && value > v.max) {
        setError(`Maximum value is ${v.max}`);
        return false;
      }

      if (v.minLength !== undefined && typeof value === 'string' && value.length < v.minLength) {
        setError(`Minimum length is ${v.minLength} characters`);
        return false;
      }

      if (v.maxLength !== undefined && typeof value === 'string' && value.length > v.maxLength) {
        setError(`Maximum length is ${v.maxLength} characters`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit?.(field.name, value);
  };

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            className="resize-none"
            rows={3}
          />
        );

      case 'select':
        return (
          <Select
            value={value as string}
            onValueChange={(val) => handleChange(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            id={field.name}
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return (
          <Input
            id={field.name}
            type="date"
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case 'text':
      default:
        return (
          <Input
            id={field.name}
            type="text"
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
        );
    }
  };

  return (
    <Card className={`${className || ''}`}>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderInput()}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {onSubmit && (
            <Button type="submit" size="sm" className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
